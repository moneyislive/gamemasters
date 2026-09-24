"""SDF en numpy: primitivas, grupos con material y mallado por surface nets.

Convenciones (espacio Blender): X = izquierda del personaje, Y = atras
(el personaje mira a -Y), Z = arriba. Metros.
"""
import numpy as np

BIG = 1.0


def _v(a):
    return np.asarray(a, dtype=np.float64)


def _norm(a):
    a = _v(a)
    return a / np.linalg.norm(a)


def frame_from_axis(axis, up=(0, 0, 1)):
    """Matriz 3x3 cuyas columnas son (e1, e2, axis) ortonormales."""
    z = _norm(axis)
    u = _v(up)
    if abs(np.dot(u, z)) > 0.95:
        u = _v((0, 1, 0)) if abs(z[1]) < 0.9 else _v((1, 0, 0))
    x = np.cross(u, z)
    x /= np.linalg.norm(x)
    y = np.cross(z, x)
    return np.stack([x, y, z], axis=1)


def rot_euler(rx=0, ry=0, rz=0):
    rx, ry, rz = np.radians([rx, ry, rz])
    cx, sx, cy, sy, cz, sz = np.cos(rx), np.sin(rx), np.cos(ry), np.sin(ry), np.cos(rz), np.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def mirror_x(p):
    p = _v(p).copy()
    p[..., 0] *= -1
    return p


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


# ---------------------------------------------------------------- primitivas
class Prim:
    region = ''
    k = None

    def conk(self, k):
        self.k = k
        return self

    def bbox(self):
        raise NotImplementedError

    def eval(self, X, Y, Z):
        raise NotImplementedError

    def inflate(self, d):
        raise NotImplementedError

    def mirrored(self):
        raise NotImplementedError

    def tag(self, region):
        self.region = region
        return self


class Sphere(Prim):
    def __init__(self, c, r):
        self.c, self.r = _v(c), float(r)

    def bbox(self):
        return self.c - self.r, self.c + self.r

    def eval(self, X, Y, Z):
        return np.sqrt((X - self.c[0]) ** 2 + (Y - self.c[1]) ** 2 + (Z - self.c[2]) ** 2) - self.r

    def inflate(self, d):
        return Sphere(self.c, self.r + d).tag(self.region)

    def mirrored(self):
        return Sphere(mirror_x(self.c), self.r).tag(self.region)


def _local(X, Y, Z, c, R):
    px, py, pz = X - c[0], Y - c[1], Z - c[2]
    lx = R[0, 0] * px + R[1, 0] * py + R[2, 0] * pz
    ly = R[0, 1] * px + R[1, 1] * py + R[2, 1] * pz
    lz = R[0, 2] * px + R[1, 2] * py + R[2, 2] * pz
    return lx, ly, lz


def _mirror_R(R):
    S = np.diag([-1.0, 1.0, 1.0])
    M = S @ R @ S
    return M


class Ellipsoid(Prim):
    """Elipsoide con ejes en las columnas de R (radios r)."""

    def __init__(self, c, r, R=None):
        self.c, self.r = _v(c), _v(r)
        self.R = np.eye(3) if R is None else _v(R)

    def bbox(self):
        ext = np.abs(self.R) @ self.r
        return self.c - ext, self.c + ext

    def eval(self, X, Y, Z):
        lx, ly, lz = _local(X, Y, Z, self.c, self.R)
        r = self.r
        k0 = np.sqrt((lx / r[0]) ** 2 + (ly / r[1]) ** 2 + (lz / r[2]) ** 2)
        k1 = np.sqrt((lx / r[0] ** 2) ** 2 + (ly / r[1] ** 2) ** 2 + (lz / r[2] ** 2) ** 2)
        return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)

    def inflate(self, d):
        return Ellipsoid(self.c, self.r + d, self.R).tag(self.region)

    def mirrored(self):
        return Ellipsoid(mirror_x(self.c), self.r, _mirror_R(self.R)).tag(self.region)


def ell_axis(c, axis, r_along, r1, r2, up=(0, 0, 1)):
    F = frame_from_axis(axis, up)
    # columnas: e1 (r1), e2 (r2), axis (r_along)
    return Ellipsoid(c, (r1, r2, r_along), F)


class RoundCone(Prim):
    def __init__(self, a, b, ra, rb, scale=None):
        self.a, self.b, self.ra, self.rb = _v(a), _v(b), float(ra), float(rb)

    def bbox(self):
        lo = np.minimum(self.a - self.ra, self.b - self.rb)
        hi = np.maximum(self.a + self.ra, self.b + self.rb)
        return lo, hi

    def eval(self, X, Y, Z):
        a, b, r1, r2 = self.a, self.b, self.ra, self.rb
        ba = b - a
        l2 = float(np.dot(ba, ba))
        rr = r1 - r2
        a2 = l2 - rr * rr
        il2 = 1.0 / l2
        pax, pay, paz = X - a[0], Y - a[1], Z - a[2]
        y = pax * ba[0] + pay * ba[1] + paz * ba[2]
        z = y - l2
        qx = pax * l2 - ba[0] * y
        qy = pay * l2 - ba[1] * y
        qz = paz * l2 - ba[2] * y
        x2 = qx * qx + qy * qy + qz * qz
        y2 = y * y * l2
        z2 = z * z * l2
        k = np.sign(rr) * rr * rr * x2
        d_mid = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
        d_b = np.sqrt(x2 + z2) * il2 - r2
        d_a = np.sqrt(x2 + y2) * il2 - r1
        out = np.where(np.sign(y) * a2 * y2 < k, d_a, d_mid)
        out = np.where(np.sign(z) * a2 * z2 > k, d_b, out)
        return out

    def inflate(self, d):
        return RoundCone(self.a, self.b, self.ra + d, self.rb + d).tag(self.region)

    def mirrored(self):
        return RoundCone(mirror_x(self.a), mirror_x(self.b), self.ra, self.rb).tag(self.region)


class RoundBox(Prim):
    def __init__(self, c, half, R=None, rad=0.0):
        self.c, self.half = _v(c), _v(half)
        self.R = np.eye(3) if R is None else _v(R)
        self.rad = float(rad)

    def bbox(self):
        ext = np.abs(self.R) @ self.half
        return self.c - ext, self.c + ext

    def eval(self, X, Y, Z):
        lx, ly, lz = _local(X, Y, Z, self.c, self.R)
        h = self.half - self.rad
        qx, qy, qz = np.abs(lx) - h[0], np.abs(ly) - h[1], np.abs(lz) - h[2]
        outside = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
        inside = np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0)
        return outside + inside - self.rad

    def inflate(self, d):
        return RoundBox(self.c, self.half + d, self.R, self.rad + d).tag(self.region)

    def mirrored(self):
        return RoundBox(mirror_x(self.c), self.half, _mirror_R(self.R), self.rad).tag(self.region)


class Plane(Prim):
    """Semiespacio: negativo donde dot(n, p) < d0."""

    def __init__(self, n, p0):
        self.n = _norm(n)
        self.d0 = float(np.dot(self.n, _v(p0)))

    def bbox(self):
        return np.full(3, -9.0), np.full(3, 9.0)

    def eval(self, X, Y, Z):
        return self.n[0] * X + self.n[1] * Y + self.n[2] * Z - self.d0

    def inflate(self, d):
        p = Plane(self.n, (0, 0, 0))
        p.d0 = self.d0 + d
        return p

    def mirrored(self):
        n = mirror_x(self.n)
        p = Plane(n, (0, 0, 0))
        p.d0 = self.d0
        return p


class Shell(Prim):
    """Cascaron de un cono de revolucion vertical (cuellos de abrigo).
    Radio r0 en z0 y r1 en z1, grosor t, eje en (cx, cy), escala en y sy."""

    def __init__(self, cx, cy, z0, z1, r0, r1, t, sy=1.0):
        self.cx, self.cy, self.z0, self.z1 = cx, cy, z0, z1
        self.r0, self.r1, self.t, self.sy = r0, r1, t, sy

    def bbox(self):
        r = max(self.r0, self.r1) + self.t
        return _v((self.cx - r, self.cy - r * self.sy, self.z0 - self.t)), _v((self.cx + r, self.cy + r * self.sy, self.z1 + self.t))

    def eval(self, X, Y, Z):
        rad = np.sqrt((X - self.cx) ** 2 + ((Y - self.cy) / self.sy) ** 2)
        s = np.clip((Z - self.z0) / (self.z1 - self.z0), 0, 1)
        rz = self.r0 + (self.r1 - self.r0) * s
        dr = np.abs(rad - rz) - self.t
        zc = 0.5 * (self.z0 + self.z1)
        dz = np.abs(Z - zc) - 0.5 * (self.z1 - self.z0)
        return np.maximum(dr, dz)

    def inflate(self, d):
        return Shell(self.cx, self.cy, self.z0, self.z1, self.r0, self.r1, self.t + d, self.sy)

    def mirrored(self):
        return Shell(-self.cx, self.cy, self.z0, self.z1, self.r0, self.r1, self.t, self.sy)


# ------------------------------------------------------------------ grupos
class Source:
    """Union suave de primitivas (+ restas e intersecciones) de un grupo."""

    def __init__(self, prims, k=0.02, clip=(), clip_k=0.004, subs=(), sub_k=0.006):
        self.prims = list(prims)
        self.k = k
        self.clip = list(clip)
        self.clip_k = clip_k
        self.subs = list(subs)
        self.sub_k = sub_k

    def bbox(self):
        los, his = zip(*[p.bbox() for p in self.prims])
        lo = np.min(np.stack(los), 0) - self.k
        hi = np.max(np.stack(his), 0) + self.k
        return lo, hi

    def eval_points(self, X, Y, Z):
        d = None
        for p in self.prims:
            e = p.eval(X, Y, Z)
            d = e if d is None else smin(d, e, self.k if p.k is None else p.k)
        for p in self.subs:
            d = smax(d, -p.eval(X, Y, Z), self.sub_k)
        for p in self.clip:
            d = smax(d, p.eval(X, Y, Z), self.clip_k)
        return d


class Group:
    def __init__(self, name, sources, k=0.0):
        self.name = name
        self.sources = list(sources)
        self.k = k

    def eval_points(self, P):
        P = np.asarray(P, float)
        X, Y, Z = P[..., 0], P[..., 1], P[..., 2]
        d = None
        for s in self.sources:
            e = s.eval_points(X, Y, Z)
            d = e if d is None else smin(d, e, self.k)
        return d


class Grid:
    def __init__(self, lo, hi, h):
        lo = _v(lo)
        hi = _v(hi)
        # simetrica en x
        mx = np.ceil(max(abs(lo[0]), abs(hi[0])) / h)
        lo[0] = -mx * h
        hi[0] = mx * h
        self.h = h
        self.lo = lo
        self.n = (np.round((hi - lo) / h).astype(int) + 1)
        self.axes = [lo[i] + np.arange(self.n[i]) * h for i in range(3)]

    def index_box(self, lo, hi):
        i0 = np.clip(np.floor((lo - self.lo) / self.h).astype(int) - 1, 0, self.n - 1)
        i1 = np.clip(np.ceil((hi - self.lo) / self.h).astype(int) + 2, 0, self.n)
        return i0, i1

    def coords(self, i0, i1):
        X = self.axes[0][i0[0]:i1[0]][:, None, None]
        Y = self.axes[1][i0[1]:i1[1]][None, :, None]
        Z = self.axes[2][i0[2]:i1[2]][None, None, :]
        return X, Y, Z


def eval_source_grid(grid, src):
    lo, hi = src.bbox()
    i0, i1 = grid.index_box(lo, hi)
    if np.any(i1 <= i0):
        return None
    shape = tuple(i1 - i0)
    acc = np.full(shape, BIG, dtype=np.float32)
    for p in src.prims:
        plo, phi = p.bbox()
        a0, a1 = grid.index_box(plo - src.k, phi + src.k)
        a0 = np.maximum(a0, i0)
        a1 = np.minimum(a1, i1)
        if np.any(a1 <= a0):
            continue
        X, Y, Z = grid.coords(a0, a1)
        d = p.eval(X, Y, Z).astype(np.float32)
        d = np.broadcast_to(d, tuple(a1 - a0))
        sl = tuple(slice(a0[j] - i0[j], a1[j] - i0[j]) for j in range(3))
        acc[sl] = smin(acc[sl], d, src.k if p.k is None else p.k)
    if src.subs or src.clip:
        X, Y, Z = grid.coords(i0, i1)
        for p in src.subs:
            plo, phi = p.bbox()
            a0, a1 = grid.index_box(plo - src.sub_k, phi + src.sub_k)
            a0 = np.maximum(a0, i0)
            a1 = np.minimum(a1, i1)
            if np.any(a1 <= a0):
                continue
            Xs, Ys, Zs = grid.coords(a0, a1)
            d = np.broadcast_to(p.eval(Xs, Ys, Zs).astype(np.float32), tuple(a1 - a0))
            sl = tuple(slice(a0[j] - i0[j], a1[j] - i0[j]) for j in range(3))
            acc[sl] = smax(acc[sl], -d, src.sub_k)
        for p in src.clip:
            d = np.broadcast_to(p.eval(X, Y, Z).astype(np.float32), shape)
            acc = smax(acc, d, src.clip_k)
    return i0, i1, acc


def build_field(grid, groups):
    """Campo final = min duro entre grupos; matid = grupo ganador."""
    F = np.full(tuple(grid.n), BIG, dtype=np.float32)
    M = np.zeros(tuple(grid.n), dtype=np.int16)
    for gi, g in enumerate(groups):
        los, his, parts = [], [], []
        for s in g.sources:
            r = eval_source_grid(grid, s)
            if r is not None:
                parts.append(r)
        if not parts:
            continue
        i0 = np.min(np.stack([p[0] for p in parts]), 0)
        i1 = np.max(np.stack([p[1] for p in parts]), 0)
        acc = np.full(tuple(i1 - i0), BIG, dtype=np.float32)
        for a0, a1, d in parts:
            sl = tuple(slice(a0[j] - i0[j], a1[j] - i0[j]) for j in range(3))
            acc[sl] = smin(acc[sl], d, g.k)
        sl = tuple(slice(i0[j], i1[j]) for j in range(3))
        cur = F[sl]
        win = acc < cur
        cur[win] = acc[win]
        M[sl][win] = gi
    return F, M


# ------------------------------------------------------------ surface nets
def trilinear(F, grid, P):
    """Valor y gradiente trilineal de F en puntos P (N,3)."""
    q = (P - grid.lo) / grid.h
    i = np.clip(np.floor(q).astype(int), 0, grid.n - 2)
    f = q - i
    fx, fy, fz = f[:, 0], f[:, 1], f[:, 2]
    ix, iy, iz = i[:, 0], i[:, 1], i[:, 2]
    c = {}
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                c[dx, dy, dz] = F[ix + dx, iy + dy, iz + dz].astype(np.float64)
    c00 = c[0, 0, 0] * (1 - fx) + c[1, 0, 0] * fx
    c01 = c[0, 0, 1] * (1 - fx) + c[1, 0, 1] * fx
    c10 = c[0, 1, 0] * (1 - fx) + c[1, 1, 0] * fx
    c11 = c[0, 1, 1] * (1 - fx) + c[1, 1, 1] * fx
    c0 = c00 * (1 - fy) + c10 * fy
    c1 = c01 * (1 - fy) + c11 * fy
    val = c0 * (1 - fz) + c1 * fz
    # gradiente
    dfx = ((c[1, 0, 0] - c[0, 0, 0]) * (1 - fy) * (1 - fz) + (c[1, 1, 0] - c[0, 1, 0]) * fy * (1 - fz)
           + (c[1, 0, 1] - c[0, 0, 1]) * (1 - fy) * fz + (c[1, 1, 1] - c[0, 1, 1]) * fy * fz)
    dfy = ((c10 - c00) * (1 - fz) + (c11 - c01) * fz)
    dfz = c1 - c0
    g = np.stack([dfx, dfy, dfz], 1) / grid.h
    return val, g


def surface_nets(F, M, grid, project_iters=2):
    S = F < 0
    n = np.array(S.shape)
    nyz = n[1] * n[2]
    cells_all = []
    pts_all = []
    quads = []   # (cells 4 arrays, flip mask, mat)
    for axis in range(3):
        a1, a2 = [(1, 2), (2, 0), (0, 1)][axis]
        sl0 = [slice(None)] * 3
        sl1 = [slice(None)] * 3
        sl0[axis] = slice(0, -1)
        sl1[axis] = slice(1, None)
        diff = S[tuple(sl0)] != S[tuple(sl1)]
        idx = np.nonzero(diff)
        idx = [np.asarray(v) for v in idx]
        # descartar aristas en el borde (sin 4 celdas)
        ok = (idx[a1] >= 1) & (idx[a1] <= n[a1] - 2) & (idx[a2] >= 1) & (idx[a2] <= n[a2] - 2)
        idx = [v[ok] for v in idx]
        f0 = F[tuple(idx)].astype(np.float64)
        idx1 = list(idx)
        idx1[axis] = idx1[axis] + 1
        f1 = F[tuple(idx1)].astype(np.float64)
        t = f0 / (f0 - f1)
        p = np.stack(idx, 1).astype(np.float64)
        p[:, axis] += t
        inside_start = f0 < 0
        mat = np.where(inside_start, M[tuple(idx)], M[tuple(idx1)])
        corners = []
        for (o1, o2) in ((1, 1), (0, 1), (0, 0), (1, 0)):
            c = list(idx)
            c[a1] = c[a1] - o1
            c[a2] = c[a2] - o2
            lin = c[0] * nyz + c[1] * n[2] + c[2]
            corners.append(lin)
            cells_all.append(lin)
            pts_all.append(p)
        quads.append((corners, inside_start, mat))
    cells = np.concatenate(cells_all)
    pts = np.concatenate(pts_all)
    uniq, inv = np.unique(cells, return_inverse=True)
    cnt = np.bincount(inv)
    V = np.stack([np.bincount(inv, weights=pts[:, j]) for j in range(3)], 1) / cnt[:, None]
    V = grid.lo + V * grid.h
    faces = []
    mats = []
    for corners, inside_start, mat in quads:
        vi = [np.searchsorted(uniq, c) for c in corners]
        q = np.stack(vi, 1)
        # orden ccw visto desde +eje cuando el interior esta al principio
        flip = ~inside_start
        q[flip] = q[flip][:, ::-1]
        faces.append(q)
        mats.append(mat)
    Fc = np.concatenate(faces)
    Mt = np.concatenate(mats)
    for _ in range(project_iters):
        val, g = trilinear(F, grid, V)
        gn2 = np.maximum((g * g).sum(1), 1e-12)
        step = (val / gn2)[:, None] * g
        sl = np.linalg.norm(step, axis=1)
        lim = np.minimum(1.0, 0.7 * grid.h / np.maximum(sl, 1e-12))
        V = V - step * lim[:, None]
    return V, Fc, Mt


class Compuesto(Prim):
    """Un Source entero usado como primitiva (para anidar restas con su propio radio)."""

    def __init__(self, src, margen=0.0):
        self.src = src
        self.margen = margen

    def bbox(self):
        lo, hi = self.src.bbox()
        return lo - self.margen, hi + self.margen

    def eval(self, X, Y, Z):
        return self.src.eval_points(X, Y, Z)


class Interseccion(Prim):
    """Interseccion dura de primitivas: la caja es la de la primera."""

    def __init__(self, prims):
        self.prims = list(prims)

    def bbox(self):
        return self.prims[0].bbox()

    def eval(self, X, Y, Z):
        d = None
        for p in self.prims:
            e = p.eval(X, Y, Z)
            d = e if d is None else np.maximum(d, e)
        return d

    def mirrored(self):
        return Interseccion([p.mirrored() for p in self.prims]).tag(self.region)


class CascaronEsfera(Prim):
    """|distancia al centro - r| - t: piel fina de una esfera (parpados)."""

    def __init__(self, c, r, t):
        self.c, self.r, self.t = _v(c), float(r), float(t)

    def bbox(self):
        e = self.r + self.t
        return self.c - e, self.c + e

    def eval(self, X, Y, Z):
        d = np.sqrt((X - self.c[0]) ** 2 + (Y - self.c[1]) ** 2 + (Z - self.c[2]) ** 2)
        return np.abs(d - self.r) - self.t

    def mirrored(self):
        return CascaronEsfera(mirror_x(self.c), self.r, self.t).tag(self.region)


class Escalado(Prim):
    """Primitiva deformada por una escala anisotropa alrededor de un centro."""

    def __init__(self, prim, c, s):
        self.prim, self.c, self.s = prim, _v(c), _v(s)
        self.region = prim.region

    def bbox(self):
        lo, hi = self.prim.bbox()
        return self.c + (lo - self.c) * self.s, self.c + (hi - self.c) * self.s

    def eval(self, X, Y, Z):
        c, s = self.c, self.s
        return self.prim.eval(c[0] + (X - c[0]) / s[0], c[1] + (Y - c[1]) / s[1],
                              c[2] + (Z - c[2]) / s[2]) * float(np.min(s))

    def inflate(self, d):
        return Escalado(self.prim.inflate(d / float(np.min(self.s))), self.c, self.s)

    def mirrored(self):
        return Escalado(self.prim.mirrored(), mirror_x(self.c), self.s)
