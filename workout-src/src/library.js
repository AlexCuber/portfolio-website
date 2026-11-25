/* Exercise library. Each row: id, name, equipment, muscle group, muscles worked (1 = main, .5 = assisting),
   figure, kind (sets the default sets, reps and rest), one coaching cue, optional overrides. */
var LIBRARY = (function () {
  'use strict';
  var KIND = {
    C: { log: 'wr', sets: 3, lo: 6, hi: 10, restSec: 150, rir: '1–2' },   /* heavy compound */
    M: { log: 'wr', sets: 3, lo: 8, hi: 12, restSec: 120, rir: '1–2' },   /* moderate compound */
    I: { log: 'wr', sets: 3, lo: 10, hi: 15, restSec: 75, rir: '0–1' },   /* isolation */
    H: { log: 'wr', sets: 3, lo: 12, hi: 20, restSec: 60, rir: '0–1' },   /* high-rep isolation */
    B: { log: 'bw', sets: 3, lo: 6, hi: 12, restSec: 120, rir: '1–2' },   /* body-weight strength */
    A: { log: 'bw', sets: 3, lo: 10, hi: 20, restSec: 60, rir: '1' },     /* body-weight core */
    T: { log: 'time', sets: 3, lo: 30, hi: 60, restSec: 45, rir: '—' },   /* timed hold */
    K: { log: 'cardio', sets: 1, lo: 20, hi: 30, restSec: 0, rir: '—' },  /* cardio, minutes */
    D: { log: 'cardio', sets: 1, lo: 20, hi: 60, restSec: 0, rir: '—' }   /* run, ride, swim: distance and time (the row's options name the sport) */
  };
  var GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio', 'Endurance'];
  var MUSCLES = [
    { id: 'chest', name: 'Chest' }, { id: 'back', name: 'Back' }, { id: 'frontDelts', name: 'Front delts' }, { id: 'sideDelts', name: 'Side delts' },
    { id: 'rearDelts', name: 'Rear delts' }, { id: 'traps', name: 'Traps' }, { id: 'biceps', name: 'Biceps' }, { id: 'triceps', name: 'Triceps' },
    { id: 'forearms', name: 'Forearms' }, { id: 'quads', name: 'Quads' }, { id: 'hams', name: 'Hamstrings' }, { id: 'glutes', name: 'Glutes' },
    { id: 'adductors', name: 'Adductors' }, { id: 'calves', name: 'Calves' }, { id: 'abs', name: 'Abs' }, { id: 'lowerBack', name: 'Lower back' }
  ];
  var R = [
    /* ---------------- Chest ---------------- */
    ['barbell-bench-press', 'Barbell bench press', 'Barbell', 'Chest', 'chest:1,triceps:.5,frontDelts:.5', 'bench-press', 'C', 'Pin your shoulder blades back and down. Lower the bar to your lower chest, then press up and slightly back.'],
    ['incline-barbell-bench-press', 'Incline barbell bench press', 'Barbell', 'Chest', 'chest:1,triceps:.5,frontDelts:.5', 'incline-press', 'C', 'Bench at about 30°. Touch the bar high on your chest with elbows roughly 60° from your sides.'],
    ['decline-bench-press', 'Decline bench press', 'Barbell', 'Chest', 'chest:1,triceps:.5', 'bench-press', 'C', 'Hook your legs in, lower the bar to your lower chest and press straight up.'],
    ['dumbbell-bench-press', 'Dumbbell bench press', 'Dumbbell', 'Chest', 'chest:1,triceps:.5,frontDelts:.5', 'bench-press-db', 'C', 'Lower until the dumbbells are level with your chest, then press up and slightly together.'],
    ['incline-machine-press', 'Incline machine press', 'Machine', 'Chest', 'chest:1,triceps:.5,frontDelts:.5', 'machine-chest-press', 'C', 'Set the seat so the handles start level with your upper chest; press without letting your shoulders roll forward.'],
    ['smith-machine-bench-press', 'Smith machine bench press', 'Smith machine', 'Chest', 'chest:1,triceps:.5,frontDelts:.5', 'bench-press', 'C', 'Slide the bench so the bar meets your lower chest; pause briefly at the bottom of each rep.'],
    ['push-up', 'Push-up', 'Bodyweight', 'Chest', 'chest:1,triceps:.5,frontDelts:.5', 'push-up', 'B', 'Body in one straight line, chest to the floor, elbows about 45° from your sides.', { lo: 8, hi: 20, restSec: 90 }],
    ['dip', 'Dip', 'Bodyweight', 'Chest', 'chest:1,triceps:1,frontDelts:.5', 'dip', 'B', 'Lean slightly forward and lower until your shoulders are just below your elbows, then press up.'],
    ['cable-fly', 'Cable fly', 'Cable', 'Chest', 'chest:1', 'cable-fly', 'I', 'Step forward into a split stance. Sweep the handles together with a slight bend in your elbows.'],
    ['high-to-low-cable-fly', 'High-to-low cable fly', 'Cable', 'Chest', 'chest:1', 'cable-fly', 'I', 'Pulleys above head height. Sweep down and in until your hands meet in front of your hips.'],
    ['dumbbell-fly', 'Dumbbell fly', 'Dumbbell', 'Chest', 'chest:1', 'db-fly', 'I', 'Keep a soft bend in the elbows and open wide until you feel a deep chest stretch.'],
    /* ---------------- Back ---------------- */
    ['chin-up', 'Chin-up', 'Bodyweight', 'Back', 'back:1,biceps:1', 'chin-up', 'B', 'Underhand, shoulder-width grip. Start from a dead hang and pull until your chin clears the bar.'],
    ['assisted-pull-up', 'Assisted pull-up', 'Machine', 'Back', 'back:1,biceps:.5', 'pull-up', 'B', 'Use just enough assistance to reach the rep range with a full hang at the bottom.', { lo: 6, hi: 12 }],
    ['neutral-grip-lat-pulldown', 'Neutral-grip lat pulldown', 'Cable', 'Back', 'back:1,biceps:.5', 'lat-pulldown', 'M', 'Palms facing each other. Drive your elbows down to your sides and keep your chest tall.'],
    ['straight-arm-pulldown', 'Straight-arm pulldown', 'Cable', 'Back', 'back:1', 'straight-arm-pulldown', 'I', 'Arms almost straight. Sweep the bar from eye level to your thighs with your lats, not your triceps.'],
    ['barbell-row', 'Barbell row', 'Barbell', 'Back', 'back:1,biceps:.5,rearDelts:.5,lowerBack:.5', 'bent-row', 'C', 'Hinge until your torso is close to horizontal and pull the bar to your lower ribs without standing up.'],
    ['dumbbell-row', 'One-arm dumbbell row', 'Dumbbell', 'Back', 'back:1,biceps:.5,rearDelts:.5', 'db-row', 'M', 'One hand and knee on the bench. Pull the dumbbell toward your hip and let the shoulder blade move freely.'],
    ['t-bar-row', 'T-bar row', 'Barbell', 'Back', 'back:1,biceps:.5,rearDelts:.5', 'bent-row', 'C', 'Keep your chest up, pull the handles to your stomach and lower under control.'],
    ['machine-row', 'Seated machine row', 'Machine', 'Back', 'back:1,biceps:.5,rearDelts:.5', 'seated-cable-row', 'M', 'Chest against the pad. Reach forward fully, then pull your elbows back past your torso.'],
    ['dumbbell-pullover', 'Dumbbell pullover', 'Dumbbell', 'Back', 'back:1,chest:.5', 'pullover', 'I', 'Lower the dumbbell behind your head with slightly bent arms, then pull it back over your chest.'],
    ['deadlift', 'Deadlift', 'Barbell', 'Back', 'hams:1,glutes:1,lowerBack:1,back:.5,traps:.5', 'deadlift', 'C', 'Bar over mid-foot, back flat. Push the floor away and stand tall, keeping the bar against your legs.', { lo: 3, hi: 6, restSec: 180, rir: '2' }],
    ['rack-pull', 'Rack pull', 'Barbell', 'Back', 'lowerBack:1,glutes:.5,back:.5,traps:1', 'deadlift', 'C', 'Bar set just below the knees. Brace, drive your hips through and finish tall without leaning back.', { lo: 4, hi: 8, restSec: 180 }],
    ['dumbbell-shrug', 'Dumbbell shrug', 'Dumbbell', 'Back', 'traps:1', 'shrug', 'I', 'Lift your shoulders straight up toward your ears, pause for a second, lower slowly. No rolling.'],
    ['barbell-shrug', 'Barbell shrug', 'Barbell', 'Back', 'traps:1', 'shrug', 'I', 'Arms straight, shrug straight up, hold the top for a second.'],
    /* ---------------- Shoulders ---------------- */
    ['overhead-press', 'Overhead press', 'Barbell', 'Shoulders', 'frontDelts:1,sideDelts:.5,triceps:.5', 'ohp', 'C', 'Squeeze your glutes, press the bar in a straight line and finish with your head through.'],
    ['seated-dumbbell-shoulder-press', 'Seated dumbbell shoulder press', 'Dumbbell', 'Shoulders', 'frontDelts:1,sideDelts:.5,triceps:.5', 'ohp-db', 'C', 'Back supported. Lower the dumbbells to ear level and press up without clanging them together.'],
    ['machine-shoulder-press', 'Machine shoulder press', 'Machine', 'Shoulders', 'frontDelts:1,sideDelts:.5,triceps:.5', 'ohp-db', 'C', 'Set the seat so the handles start at shoulder height; press to just short of lockout.'],
    ['arnold-press', 'Arnold press', 'Dumbbell', 'Shoulders', 'frontDelts:1,sideDelts:.5,triceps:.5', 'ohp-db', 'M', 'Start with palms facing you and rotate them forward as you press overhead.'],
    ['machine-lateral-raise', 'Machine lateral raise', 'Machine', 'Shoulders', 'sideDelts:1', 'lateral-raise', 'H', 'Lead with your elbows and stop at shoulder height; lower slowly.'],
    ['dumbbell-front-raise', 'Dumbbell front raise', 'Dumbbell', 'Shoulders', 'frontDelts:1', 'front-raise', 'I', 'Raise to eye level with a soft elbow and no swing from the hips.'],
    ['dumbbell-reverse-fly', 'Bent-over dumbbell reverse fly', 'Dumbbell', 'Shoulders', 'rearDelts:1,back:.5', 'reverse-fly', 'H', 'Hinge forward, sweep the dumbbells out wide and lead with your pinkies.'],
    ['cable-rear-delt-fly', 'Cable rear-delt fly', 'Cable', 'Shoulders', 'rearDelts:1', 'reverse-fly', 'H', 'Cables crossed at shoulder height. Pull your hands apart and back without squeezing the shoulder blades hard.'],
    ['upright-row', 'Upright row', 'EZ bar', 'Shoulders', 'sideDelts:1,traps:.5', 'upright-row', 'I', 'Hands shoulder-width, pull your elbows up and out to shoulder height.'],
    /* ---------------- Biceps ---------------- */
    ['barbell-curl', 'Barbell curl', 'Barbell', 'Biceps', 'biceps:1,forearms:.5', 'curl', 'I', 'Elbows stay by your sides. Curl without leaning back and lower for a full two seconds.', { lo: 8, hi: 12 }],
    ['ez-bar-curl', 'EZ-bar curl', 'EZ bar', 'Biceps', 'biceps:1,forearms:.5', 'curl', 'I', 'Grip the angled part of the bar, keep your elbows still and straighten fully at the bottom.', { lo: 8, hi: 12 }],
    ['dumbbell-curl', 'Dumbbell curl', 'Dumbbell', 'Biceps', 'biceps:1', 'curl-db', 'I', 'Turn your palms up as you curl; straighten the arm fully between reps.', { lo: 8, hi: 12 }],
    ['cable-curl', 'Cable curl', 'Cable', 'Biceps', 'biceps:1', 'curl-cable', 'I', 'Stand a step back from the stack so the cable keeps tension at the bottom.'],
    ['cable-curl-facing-away', 'Cable curl facing away', 'Cable', 'Biceps', 'biceps:1', 'incline-db-curl', 'I', 'Face away from a low pulley with your arm behind your body; curl without the elbow drifting forward.'],
    ['machine-preacher-curl', 'Machine preacher curl', 'Machine', 'Biceps', 'biceps:1', 'preacher-curl', 'I', 'Armpits snug on the pad. Lower until your arms are almost straight.'],
    ['concentration-curl', 'Concentration curl', 'Dumbbell', 'Biceps', 'biceps:1', 'preacher-curl', 'I', 'Brace your elbow against your inner thigh and curl without moving the upper arm.'],
    ['spider-curl', 'Spider curl', 'Dumbbell', 'Biceps', 'biceps:1', 'preacher-curl', 'I', 'Chest on an incline bench, arms hanging straight down; curl and squeeze at the top.'],
    /* ---------------- Triceps ---------------- */
    ['close-grip-bench-press', 'Close-grip bench press', 'Barbell', 'Triceps', 'triceps:1,chest:.5,frontDelts:.5', 'bench-press', 'C', 'Hands just inside shoulder width. Keep your elbows tucked and touch the bar low on your chest.'],
    ['skullcrusher', 'Skullcrusher', 'EZ bar', 'Triceps', 'triceps:1', 'skullcrusher', 'I', 'Upper arms tilted slightly back. Lower the bar behind your head and extend without flaring the elbows.'],
    ['dumbbell-overhead-triceps-extension', 'Dumbbell overhead triceps extension', 'Dumbbell', 'Triceps', 'triceps:1', 'overhead-db-ext', 'I', 'Hold one dumbbell with both hands. Keep your elbows pointing up and lower it deep behind your head.'],
    ['triceps-kickback', 'Triceps kickback', 'Dumbbell', 'Triceps', 'triceps:1', 'kickback', 'H', 'Upper arm parallel to the floor and still. Straighten the elbow fully and pause.'],
    ['cross-body-cable-extension', 'Cross-body cable extension', 'Cable', 'Triceps', 'triceps:1', 'triceps-pushdown', 'I', 'Grab the opposite high cable and extend down and across your body, one arm at a time.'],
    ['bench-dip', 'Bench dip', 'Bodyweight', 'Triceps', 'triceps:1,chest:.5', 'dip', 'B', 'Hands on a bench behind you. Lower until your upper arms are parallel to the floor.', { lo: 8, hi: 15, restSec: 90 }],
    ['close-grip-push-up', 'Close-grip push-up', 'Bodyweight', 'Triceps', 'triceps:1,chest:.5', 'push-up', 'B', 'Hands under your chest, elbows brushing your ribs on the way down.', { lo: 8, hi: 20, restSec: 90 }],
    /* ---------------- Forearms ---------------- */
    ['reverse-curl', 'Reverse curl', 'EZ bar', 'Forearms', 'forearms:1,biceps:.5', 'curl', 'I', 'Overhand grip. Curl with your wrists straight and lower slowly.'],
    ['wrist-curl', 'Wrist curl', 'Dumbbell', 'Forearms', 'forearms:1', 'wrist-curl', 'H', 'Forearms resting on your thighs, palms up. Let the weight roll to your fingertips, then curl the wrist.'],
    ['reverse-wrist-curl', 'Reverse wrist curl', 'Dumbbell', 'Forearms', 'forearms:1', 'wrist-curl', 'H', 'Forearms on your thighs, palms down. Lift the back of your hand as high as it goes.'],
    ['farmers-carry', 'Farmer’s carry', 'Dumbbell', 'Forearms', 'forearms:1,traps:.5', 'farmer-walk', 'T', 'Stand tall with heavy dumbbells and walk with short, quick steps.', { lo: 30, hi: 60, restSec: 90 }],
    ['dead-hang', 'Dead hang', 'Bodyweight', 'Forearms', 'forearms:1', 'dead-hang', 'T', 'Hang from the bar with straight arms and relaxed shoulders for as long as your grip holds.'],
    /* ---------------- Quads ---------------- */
    ['back-squat', 'Back squat', 'Barbell', 'Quads', 'quads:1,glutes:.5,lowerBack:.5', 'squat', 'C', 'Bar on your upper back. Break at hips and knees together and squat at least to parallel.', { restSec: 180 }],
    ['front-squat', 'Front squat', 'Barbell', 'Quads', 'quads:1,glutes:.5', 'front-squat', 'C', 'Bar on the front of your shoulders, elbows high. Stay upright and let your knees travel forward.', { restSec: 180 }],
    ['goblet-squat', 'Goblet squat', 'Dumbbell', 'Quads', 'quads:1,glutes:.5', 'goblet-squat', 'M', 'Hold a dumbbell at your chest and sit down between your heels.'],
    ['smith-machine-squat', 'Smith machine squat', 'Smith machine', 'Quads', 'quads:1,glutes:.5', 'squat', 'C', 'Feet slightly in front of the bar so you can stay upright and squat deep.'],
    ['pendulum-squat', 'Pendulum squat', 'Machine', 'Quads', 'quads:1,glutes:.5', 'hack-squat', 'C', 'Feet low on the plate. Sink as deep as you can control and drive up without bouncing.'],
    ['single-leg-leg-press', 'Single-leg leg press', 'Machine', 'Quads', 'quads:1,glutes:.5', 'leg-press', 'M', 'One foot in the middle of the plate. Keep your hips square and your knee tracking over your toes.'],
    ['walking-lunge', 'Walking lunge', 'Dumbbell', 'Quads', 'quads:1,glutes:1', 'lunge', 'M', 'Long steps. Lower the back knee to just above the floor and push through the front foot.'],
    ['reverse-lunge', 'Reverse lunge', 'Dumbbell', 'Quads', 'quads:1,glutes:1', 'lunge', 'M', 'Step back, drop the back knee toward the floor and drive up through the front heel.'],
    ['split-squat', 'Split squat', 'Dumbbell', 'Quads', 'quads:1,glutes:.5', 'lunge', 'M', 'Feet stay planted in a long stride. Move straight down and up.'],
    ['step-up', 'Step-up', 'Dumbbell', 'Quads', 'quads:1,glutes:1', 'step-up', 'M', 'Whole foot on the box. Stand up through that leg without pushing off the floor.'],
    /* ---------------- Hamstrings ---------------- */
    ['dumbbell-romanian-deadlift', 'Dumbbell Romanian deadlift', 'Dumbbell', 'Hamstrings', 'hams:1,glutes:1', 'romanian-deadlift', 'M', 'Slide the dumbbells down your thighs as your hips go back; stop when your hamstrings are fully stretched.'],
    ['single-leg-romanian-deadlift', 'Single-leg Romanian deadlift', 'Dumbbell', 'Hamstrings', 'hams:1,glutes:1', 'romanian-deadlift', 'M', 'Hinge on one leg with hips square, the free leg reaching straight back.'],
    ['good-morning', 'Good morning', 'Barbell', 'Hamstrings', 'hams:1,glutes:.5,lowerBack:1', 'good-morning', 'M', 'Bar on your upper back, knees soft. Push your hips back until your torso is near horizontal.'],
    ['lying-leg-curl', 'Lying leg curl', 'Machine', 'Hamstrings', 'hams:1', 'lying-leg-curl', 'I', 'Hips pressed into the pad. Curl your heels to your glutes and lower all the way.'],
    ['nordic-curl', 'Nordic curl', 'Bodyweight', 'Hamstrings', 'hams:1', 'nordic', 'B', 'Ankles anchored, body straight from knees to head. Lower as slowly as you can, then push back up.', { lo: 4, hi: 8 }],
    /* ---------------- Glutes ---------------- */
    ['hip-thrust', 'Barbell hip thrust', 'Barbell', 'Glutes', 'glutes:1,hams:.5', 'hip-thrust', 'M', 'Upper back on the bench, chin tucked. Drive your hips up until your torso is level and pause.'],
    ['machine-hip-thrust', 'Hip thrust machine', 'Machine', 'Glutes', 'glutes:1,hams:.5', 'hip-thrust', 'M', 'Belt low across your hips. Lock out fully and hold for a second at the top.'],
    ['glute-bridge', 'Glute bridge', 'Bodyweight', 'Glutes', 'glutes:1,hams:.5', 'glute-bridge', 'A', 'Feet flat and close to your hips. Squeeze your glutes to lift, ribs down.'],
    ['sumo-deadlift', 'Sumo deadlift', 'Barbell', 'Glutes', 'glutes:1,hams:1,quads:.5,lowerBack:.5,adductors:.5', 'deadlift', 'C', 'Wide stance, toes out, hands inside your knees. Push your knees out and stand up.', { lo: 3, hi: 6, restSec: 180, rir: '2' }],
    ['cable-pull-through', 'Cable pull-through', 'Cable', 'Glutes', 'glutes:1,hams:.5', 'pull-through', 'I', 'Face away from a low pulley, rope between your legs. Hinge back, then snap your hips forward.'],
    ['cable-glute-kickback', 'Cable glute kickback', 'Cable', 'Glutes', 'glutes:1', 'glute-kickback', 'I', 'Ankle strap on. Kick straight back from the hip without arching your lower back.'],
    ['hip-abduction', 'Hip abduction machine', 'Machine', 'Glutes', 'glutes:1', 'hip-abduction', 'H', 'Lean slightly forward and push your knees apart, pausing at the widest point.'],
    ['hip-adduction', 'Hip adduction machine', 'Machine', 'Glutes', 'adductors:1', 'hip-adduction', 'H', 'Start as wide as is comfortable and squeeze your knees together under control.'],
    ['kettlebell-swing', 'Kettlebell swing', 'Kettlebell', 'Glutes', 'glutes:1,hams:1', 'kb-swing', 'H', 'It is a hinge, not a squat. Hike the bell back and snap your hips to float it to chest height.'],
    /* ---------------- Calves ---------------- */
    ['seated-calf-raise', 'Seated calf raise', 'Machine', 'Calves', 'calves:1', 'seated-calf-raise', 'I', 'Let your heels sink into a full stretch and hold it for a second on every rep.'],
    ['single-leg-calf-raise', 'Single-leg calf raise', 'Dumbbell', 'Calves', 'calves:1', 'standing-calf-raise', 'I', 'Ball of one foot on a step, a dumbbell in the same-side hand. Full stretch, full rise.'],
    ['smith-machine-calf-raise', 'Smith machine calf raise', 'Smith machine', 'Calves', 'calves:1', 'standing-calf-raise', 'I', 'Balls of your feet on a plate or step, knees straight, pause at the bottom.'],
    /* ---------------- Core ---------------- */
    ['plank', 'Plank', 'Bodyweight', 'Core', 'abs:1', 'plank', 'T', 'Elbows under shoulders, glutes tight, ribs down. Stop when your hips start to sag.'],
    ['crunch', 'Crunch', 'Bodyweight', 'Core', 'abs:1', 'crunch', 'A', 'Curl your ribs toward your pelvis and keep your lower back on the floor.'],
    ['bicycle-crunch', 'Bicycle crunch', 'Bodyweight', 'Core', 'abs:1', 'crunch', 'A', 'Bring each elbow toward the opposite knee slowly, with your shoulders off the floor.'],
    ['sit-up', 'Sit-up', 'Bodyweight', 'Core', 'abs:1', 'sit-up', 'A', 'Feet anchored. Curl up one vertebra at a time and lower under control.'],
    ['decline-sit-up', 'Decline sit-up', 'Bodyweight', 'Core', 'abs:1', 'sit-up', 'A', 'Hold a plate at your chest once body weight gets easy.'],
    ['machine-crunch', 'Machine crunch', 'Machine', 'Core', 'abs:1', 'cable-crunch', 'I', 'Round your spine to bring your ribs toward your pelvis; your hips stay still.'],
    ['lying-leg-raise', 'Lying leg raise', 'Bodyweight', 'Core', 'abs:1', 'lying-leg-raise', 'A', 'Lower back pressed into the floor. Lower your legs only as far as you can keep it there.'],
    ['reverse-crunch', 'Reverse crunch', 'Bodyweight', 'Core', 'abs:1', 'lying-leg-raise', 'A', 'Curl your pelvis off the floor to bring your knees toward your chest.'],
    ['captains-chair-knee-raise', 'Captain’s chair knee raise', 'Bodyweight', 'Core', 'abs:1', 'hanging-leg-raise', 'A', 'Forearms on the pads. Curl your pelvis up as your knees rise; no swinging.'],
    ['toes-to-bar', 'Toes-to-bar', 'Bodyweight', 'Core', 'abs:1,forearms:.5', 'hanging-leg-raise', 'A', 'Hang from the bar and raise your straight legs until your toes touch it.', { lo: 5, hi: 12 }],
    ['russian-twist', 'Russian twist', 'Plate', 'Core', 'abs:1', 'russian-twist', 'A', 'Lean back with a tall spine and turn your whole ribcage, not just your arms.'],
    ['cable-woodchop', 'Cable woodchop', 'Cable', 'Core', 'abs:1', 'woodchop', 'I', 'Arms nearly straight. Rotate from high on one side to low on the other, pivoting the back foot.'],
    ['mountain-climber', 'Mountain climbers', 'Bodyweight', 'Core', 'abs:1', 'mountain-climber', 'T', 'Hands under shoulders, hips level. Drive your knees toward your chest at a steady pace.', { lo: 20, hi: 45 }],
    /* ---------------- Cardio ---------------- */
    ['treadmill-run', 'Treadmill run', 'Cardio machine', 'Cardio', '', 'run', 'K', 'Easy runs should feel conversational. Save the hard efforts for one session a week.'],
    ['incline-walk', 'Incline treadmill walk', 'Cardio machine', 'Cardio', '', 'walk', 'K', 'A steep incline at a brisk walk, without holding the rails.', { lo: 20, hi: 40 }],
    ['stationary-bike', 'Stationary bike', 'Cardio machine', 'Cardio', '', 'bike', 'K', 'Saddle at hip height, a steady cadence of 80 to 90 rpm.'],
    ['rowing-machine', 'Rowing machine', 'Cardio machine', 'Cardio', '', 'rower', 'K', 'Legs, then body, then arms on the drive. Reverse the order on the way back.', { lo: 10, hi: 20 }],
    ['elliptical', 'Elliptical', 'Cardio machine', 'Cardio', '', 'elliptical', 'K', 'Stand tall and push and pull the handles in rhythm with your legs.'],
    ['stair-climber', 'Stair climber', 'Cardio machine', 'Cardio', '', 'stairs', 'K', 'Whole foot on each step, light hands on the rails.', { lo: 10, hi: 20 }],
    ['jump-rope', 'Jump rope', 'Other', 'Cardio', 'calves:.5', 'jump-rope', 'K', 'Small hops, wrists turning the rope, elbows close to your sides.', { lo: 5, hi: 15 }],
    ['air-bike-intervals', 'Air bike intervals', 'Cardio machine', 'Cardio', '', 'bike', 'K', 'Hard for 20 to 30 seconds, easy for 90. Repeat.', { lo: 8, hi: 15 }],
    ['outdoor-run', 'Run', 'Outdoors', 'Endurance', '', 'out-run', 'D', 'Most runs should be easy enough to talk in full sentences. Keep the hard efforts to one or two a week.', { sport: 'run' }],
    ['trail-run', 'Trail run', 'Outdoors', 'Endurance', '', 'out-run', 'D', 'Shorter steps on climbs and rough ground. Go by effort, not by pace.', { sport: 'run' }],
    ['bike-ride', 'Bike ride', 'Outdoors', 'Endurance', '', 'out-ride', 'D', 'A steady cadence, around 80 to 95 turns a minute. Eat and drink on anything over an hour.', { sport: 'ride', lo: 30, hi: 120 }],
    ['pool-swim', 'Swim', 'Pool', 'Endurance', '', 'out-swim', 'D', 'Long strokes, breathe out under water, and swim in sets of lengths so they are easy to count.', { sport: 'swim', lo: 15, hi: 45 }],
    ['open-water-swim', 'Open-water swim', 'Outdoors', 'Endurance', '', 'out-swim', 'D', 'Look up to check your line every six to ten strokes. Swim with someone, and take a tow float.', { sport: 'swim', lo: 15, hi: 45 }]
  ];
  /* where the exercises that came with the plan belong, and which figure they use */
  var PLAN_META = {
    'incline-dumbbell-press': ['Dumbbell', 'Chest', 'incline-db-press'], 'chest-supported-row': ['Machine', 'Back', 'chest-supported-row'], 'lat-pulldown': ['Cable', 'Back', 'lat-pulldown'],
    'pec-deck': ['Machine', 'Chest', 'pec-deck'], 'cable-lateral-raise': ['Cable', 'Shoulders', 'cable-lateral-raise'], 'overhead-cable-triceps-extension': ['Cable', 'Triceps', 'overhead-triceps'],
    'incline-dumbbell-curl': ['Dumbbell', 'Biceps', 'incline-db-curl'], 'hack-squat': ['Machine', 'Quads', 'hack-squat'], 'romanian-deadlift': ['Barbell', 'Hamstrings', 'romanian-deadlift'],
    'leg-extension': ['Machine', 'Quads', 'leg-extension'], 'seated-leg-curl': ['Machine', 'Hamstrings', 'seated-leg-curl'], 'standing-calf-raise': ['Machine', 'Calves', 'standing-calf-raise'],
    'cable-crunch': ['Cable', 'Core', 'cable-crunch'], 'pull-up': ['Bodyweight', 'Back', 'pull-up'], 'machine-chest-press': ['Machine', 'Chest', 'machine-chest-press'],
    'seated-cable-row': ['Cable', 'Back', 'seated-cable-row'], 'low-to-high-cable-fly': ['Cable', 'Chest', 'low-to-high-cable-fly'], 'dumbbell-lateral-raise': ['Dumbbell', 'Shoulders', 'lateral-raise'],
    'reverse-pec-deck': ['Machine', 'Shoulders', 'reverse-pec-deck'], 'preacher-curl': ['EZ bar', 'Biceps', 'preacher-curl'], 'triceps-pushdown': ['Cable', 'Triceps', 'triceps-pushdown'],
    'leg-press': ['Machine', 'Quads', 'leg-press'], 'bulgarian-split-squat': ['Dumbbell', 'Quads', 'bulgarian-split-squat'], '45-back-extension': ['Bodyweight', 'Hamstrings', 'back-extension'],
    'leg-press-calf-raise': ['Machine', 'Calves', 'leg-press-calf-raise'], 'hanging-leg-raise': ['Bodyweight', 'Core', 'hanging-leg-raise'], 'zone-2-cardio': ['Cardio machine', 'Cardio', 'bike'],
    'ab-wheel-rollout': ['Other', 'Core', 'ab-wheel-rollout'], 'lateral-raise': ['Dumbbell', 'Shoulders', 'lateral-raise'], 'face-pull': ['Cable', 'Shoulders', 'face-pull'],
    'hammer-curl': ['Dumbbell', 'Biceps', 'hammer-curl'], 'overhead-triceps-extension': ['Cable', 'Triceps', 'overhead-triceps'], 'side-plank': ['Bodyweight', 'Core', 'side-plank']
  };
  var GROUP_ILLO = { Chest: 'm-chest', Back: 'm-back', Shoulders: 'm-shoulders', Biceps: 'm-biceps', Triceps: 'm-triceps', Forearms: 'm-forearms', Quads: 'm-quads', Hamstrings: 'm-hamstrings', Glutes: 'm-glutes', Calves: 'm-calves', Core: 'm-core', Cardio: 'm-cardio', Endurance: 'out-run' };
  var GROUP_MUSCLE = { Chest: 'chest', Back: 'back', Shoulders: 'sideDelts', Biceps: 'biceps', Triceps: 'triceps', Forearms: 'forearms', Quads: 'quads', Hamstrings: 'hams', Glutes: 'glutes', Calves: 'calves', Core: 'abs' };

  function parseMuscles(s) { var o = {}; if (!s) return o; s.split(',').forEach(function (p) { var kv = p.split(':'); o[kv[0]] = +kv[1]; }); return o; }
  function unitOf(log) { return log === 'cardio' ? 'min' : log === 'time' ? 's' : 'reps'; }
  function build(plan) {
    var list = [], seen = {};
    Object.keys(plan.sessions).forEach(function (k) {
      plan.sessions[k].exercises.forEach(function (e) {
        var m = PLAN_META[e.id] || ['Other', 'Core', e.illo];
        e.illo = m[2];
        if (seen[e.id]) return; seen[e.id] = 1;
        list.push({ id: e.id, name: e.name, equip: m[0], group: m[1], muscles: e.muscles || {}, illo: m[2], log: e.log, unit: e.unit, sets: e.sets, lo: e.lo, hi: e.hi,
          restSec: e.restSec < 30 ? 75 : e.restSec, rir: e.rir, cue: e.cue, detail: e.detail || '', why: e.why || '', swap: e.swap || '', weightHint: e.weightHint || '', plan: true });
      });
    });
    R.forEach(function (r) {
      if (seen[r[0]]) return; seen[r[0]] = 1;
      var k = KIND[r[6]], o = r[8] || {};
      list.push({ id: r[0], name: r[1], equip: r[2], group: r[3], muscles: parseMuscles(r[4]), illo: r[5], log: k.log, unit: unitOf(k.log), sets: o.sets || k.sets, lo: o.lo || k.lo, hi: o.hi || k.hi,
        restSec: o.restSec != null ? o.restSec : k.restSec, rir: o.rir || k.rir, cue: r[7], detail: '', why: '', swap: '', sport: o.sport || '',
        weightHint: k.log === 'bw' ? 'Leave the weight empty for body weight only, or enter the weight you added.' : (r[2] === 'Dumbbell' && k.log === 'wr' ? 'Weight per dumbbell.' : '') });
    });
    return list;
  }
  return { build: build, GROUPS: GROUPS, MUSCLES: MUSCLES, KIND: KIND, GROUP_ILLO: GROUP_ILLO, GROUP_MUSCLE: GROUP_MUSCLE, unitOf: unitOf };
})();
if (typeof module !== 'undefined') module.exports = LIBRARY;
