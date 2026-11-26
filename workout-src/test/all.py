#!/usr/bin/env python3
"""Runs every test, one after another, and says which failed. Build first: python3 build.py
Usage, from the project folder: python3 test/all.py            (everything)
                                python3 test/all.py lifts tod  (only those)"""
import subprocess, sys, os, time
import re
def failed(rc, out):
    """Older tests print their verdict instead of setting an exit code, so both are read."""
    if rc != 0: return True
    for l in out:
        t = l.strip()
        if t.startswith('FAIL ') or 'SOME FAILED' in t or t.startswith('FAILED:') or 'pageerror:' in t or 'Traceback' in t: return True
        m = re.match(r'(page )?errors:?\s*(\[.*\])\s*$', t)
        if m and m.group(2) != '[]': return True
    return False
ROOT = os.path.dirname(os.path.abspath(__file__)); TOP = os.path.dirname(ROOT)
TESTS = ['run.py basic', 'run.py editor', 'run.py migrate', 'run.py sync', 'safesave.py', 'worklist.py', 'train.py', 'overview.py', 'targets.py', 'block.py', 'undo.py', 'sweep.py', 'backup.py', 'offline.py', 'dates.py', 'plan.py', 'warmup.py',
         'workout_nav.py', 'restbar.py', 'progbar.py', 'endurance.py', 'tiles_history.py', 'tod.py', 'lifts.py', 'liftnav.py', 'look.py', 'widths.py']
want = sys.argv[1:]; bad = []; t00 = time.time()
for t in TESTS:
    if want and not any(w in t for w in want): continue
    t0 = time.time(); r = subprocess.run([sys.executable, os.path.join(ROOT, t.split()[0])] + t.split()[1:], cwd=TOP, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().splitlines()
    no = failed(r.returncode, out)
    print('%-4s %-16s %3d s' % ('FAIL' if no else 'ok', t, time.time() - t0), flush=True)
    if no:
        bad.append(t); print('\n'.join('       ' + l for l in [l for l in out if 'FAIL' in l or 'Error' in l or 'rror' in l][:12] + out[-4:]), flush=True)
print('%d failed: %s' % (len(bad), ', '.join(bad)) if bad else 'All passed', 'in %d s' % (time.time() - t00))
sys.exit(1 if bad else 0)
