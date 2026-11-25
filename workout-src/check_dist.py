#!/usr/bin/env python3
"""Checks that the published folder (../workout) is exactly what this source builds.
Run after build.py. Fails with a list of the files that differ."""
import os, sys, filecmp
R = os.path.dirname(os.path.abspath(__file__)); built = os.path.join(R, 'dist', 'pwa')
live = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, '..', 'workout'))
SKIP = {'README.md', 'wrangler.jsonc', '.assetsignore'}   # these belong to the published folder only
def files(top):
    out = set()
    for dp, _, fs in os.walk(top):
        for f in fs:
            rel = os.path.relpath(os.path.join(dp, f), top)
            if rel not in SKIP and not rel.startswith('.wrangler') and f != '.DS_Store': out.add(rel)
    return out
a, b = files(built), files(live); bad = []
bad += ['only in the build: ' + f for f in sorted(a - b)] + ['only in workout/: ' + f for f in sorted(b - a)]
bad += ['differs: ' + f for f in sorted(a & b) if not filecmp.cmp(os.path.join(built, f), os.path.join(live, f), shallow=False)]
if bad:
    print('workout/ does not match the source. Run build.py and copy dist/pwa into workout/.\n  ' + '\n  '.join(bad)); sys.exit(1)
print('workout/ matches the source (%d files)' % len(a))
