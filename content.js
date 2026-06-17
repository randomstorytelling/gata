/* ============================================================
   GATA — content layer (researched, evidence-informed)
   Pure data. No logic. Exposed as window.GATA.
   ============================================================ */
window.GATA = {
  phases: [
    {
      key:"menstrual", phase:"Menstrual phase", alsoCalled:"Menstruation · the bleeding phase · “inner winter”",
      typicalDays:"Roughly Days 1–5, starting the first day of full bleeding. Length varies; some bleed 3 days, some 7.",
      hormones:"This is the lowest-hormone stretch of your whole cycle: estrogen and progesterone have both dropped to their floor, which is what triggered the bleed. With those two low, your brain nudges FSH upward to start ripening a new egg, while LH stays quiet for now.",
      bodyMind:"You may feel tired, heavier, crampy, or just slower, and more sensitive to cold, hunger, and overstimulation — energy is genuinely at its lowest, so don't read that as laziness. Emotionally many feel quieter and more inward, which makes this a natural time for rest, reflection, and reassessing what's working.",
      herbs:[
        {name:"Ginger",why:"Anti-inflammatory compounds have eased menstrual cramp pain comparably to common OTC pain relievers in small trials."},
        {name:"Cinnamon",why:"May reduce menstrual pain and heaviness of flow, with gentle warmth many find comforting.",caution:"Cassia cinnamon contains coumarin; favor Ceylon if using daily, and keep it food-level."},
        {name:"Cramp bark (Viburnum opulus)",why:"Traditionally used to relax uterine muscle and soften cramping."},
        {name:"Chamomile",why:"Mild antispasmodic and calming properties take the edge off cramps and tension.",caution:"Skip if allergic to ragweed or daisy-family plants."},
        {name:"Fennel",why:"Small studies suggest it lessens period pain and eases bloating and gas."},
        {name:"Raspberry leaf",why:"A classic uterine tonic many find steadying, though cramp evidence is largely traditional."}
      ],
      workouts:[
        {type:"Walking (gentle, outdoors)",why:"Low-effort movement boosts circulation and can ease cramps without demanding energy you don't have."},
        {type:"Restorative or yin yoga",why:"Slow supported poses release low-back and pelvic tension and signal it's safe to rest."},
        {type:"Gentle stretching & mobility",why:"Loosens the hips, low back, and abdomen where period tension settles."},
        {type:"Light Pilates / core-gentle mat",why:"Keeps you connected to body and breath at an intensity you can dial down."},
        {type:"Easy swimming",why:"Water supports your weight for movement and mood lift with little strain."},
        {type:"A full rest day",why:"Choosing to do nothing is a legitimate, body-honoring option, not a failure of discipline."}
      ],
      foods:[
        {name:"Grass-fed red meat or liver",why:"Among the most absorbable iron sources to replace menstrual loss, plus B12 for energy."},
        {name:"Lentils & beans",why:"Plant iron plus fiber; pair with vitamin C to boost absorption."},
        {name:"Dark leafy greens",why:"Iron, magnesium, and folate to support energy and blood rebuilding."},
        {name:"Beets",why:"Rich in iron and nitrates that support healthy blood flow."},
        {name:"Pumpkin & sunflower seeds",why:"Magnesium and zinc — magnesium helps relax muscles and ease cramps."},
        {name:"Wild salmon or sardines",why:"Omega-3 fats are anti-inflammatory and linked to less menstrual pain."},
        {name:"Dark chocolate (70%+)",why:"A useful source of magnesium and iron that satisfies cravings without a sugar load."},
        {name:"Warm soups & stews",why:"Easy to digest and warming when energy and body temperature run low."}
      ],
      teas:[
        {name:"Ginger tea",why:"Warming and anti-inflammatory, a go-to for cramps and queasiness."},
        {name:"Chamomile tea",why:"Calming and mildly antispasmodic for winding down."},
        {name:"Red raspberry leaf",why:"A traditional uterine tonic many reach for during their period."},
        {name:"Peppermint tea",why:"Eases the bloating and digestive sluggishness that accompany menstruation."},
        {name:"Cinnamon tea",why:"Warming, may help with cramp comfort and heavy flow."}
      ],
      supplements:[
        {name:"Magnesium (glycinate/citrate)",why:"Relaxes muscles, eases cramps, supports sleep and mood.",caution:"Citrate can loosen stools; switch to glycinate if so."},
        {name:"Omega-3 fish oil",why:"Anti-inflammatory fats linked to reduced menstrual pain.",caution:"Mild blood-thinning effect — check first if on anticoagulants."},
        {name:"Iron",why:"Replaces iron lost through bleeding and counters fatigue, especially with heavy flow.",caution:"Don't supplement without confirming low levels by bloodwork; excess is harmful."},
        {name:"Vitamin B12",why:"Supports energy and healthy red-blood-cell production alongside iron."},
        {name:"Vitamin C",why:"Boosts absorption of plant-based iron and supports recovery."},
        {name:"Vitamin D",why:"Adequate levels link to less menstrual pain and better mood.",caution:"Fat-soluble and can build up — dose to a blood test."}
      ],
      lifestyle:[
        "Protect early bedtimes and aim for a little extra sleep; your body is doing real recovery work.",
        "Use a heating pad on your low belly or back (research-backed for cramp relief).",
        "Clear your calendar where you can and say no to optional commitments without guilt.",
        "Stay warm and cozy — layers, socks, warm drinks — since you may feel the cold more.",
        "Journal on the past cycle: what drained you and what you want more of.",
        "Hydrate well to help bloating, energy, and replacing lost fluid."
      ],
      nervousSystem:[
        "Slow nasal breathing with a long exhale (inhale 4, exhale 6–8) to switch on the parasympathetic response.",
        "A warm bath or shower to relax muscles and soothe the system.",
        "Legs-up-the-wall for a few minutes to downshift.",
        "Gentle self-massage of the low belly and low back, optionally with warm oil.",
        "A short body-scan or guided meditation to drop into rest.",
        "Permission to do less — quiet time, lower screen and social stimulation."
      ],
      eatLess:["Caffeine (can tighten blood vessels and worsen cramps, tenderness, jitters).","Alcohol (disrupts sleep and deepens fatigue and low mood).","Heavily salted / ultra-processed foods (add to bloating).","Lots of added sugar (spikes and crashes fragile energy)."],
      affirmation:"I am allowed to slow down and rest; this quiet is part of my strength, not the absence of it."
    },
    {
      key:"follicular", phase:"Follicular phase", alsoCalled:"Pre-ovulatory · “inner spring” · rising-energy phase",
      typicalDays:"Roughly Days 6–13, after your period ends and before ovulation (length varies).",
      hormones:"Estrogen climbs steadily as a follicle ripens, lifting mood, energy, and skin. FSH kicked off the follicle's growth then eases; LH stays low until it surges to trigger ovulation. Progesterone stays low, only rising after you ovulate.",
      bodyMind:"As estrogen rises you'll likely feel more like yourself — and then some: more energy, brighter mood, sharper focus, returning confidence and libido. Things feel lighter and less puffy. This is your season for starting things, learning, planning, socializing, and taking on challenge.",
      herbs:[
        {name:"Nettle leaf",why:"A mineral-rich nourishing herb (iron, magnesium, calcium) that replenishes stores after blood loss."},
        {name:"Schisandra berry",why:"An adaptogen used for steady energy, focus, and liver function as estrogen rises.",caution:"Avoided in pregnancy; check first with a liver condition."},
        {name:"Maca root",why:"A root many find supportive for energy, mood, and libido in the building half.",caution:"Start low; can feel stimulating — take earlier in the day."},
        {name:"Red raspberry leaf",why:"A gentle uterine tonic and mineral source, often a daily tea here."},
        {name:"Ashwagandha",why:"An adaptogen that may buffer stress and support steady energy.",caution:"Often avoided in pregnancy, thyroid, or autoimmune conditions — check first."},
        {name:"Milk thistle",why:"Traditionally supports the liver, which clears estrogen as it rises.",caution:"Can interact with liver-metabolized meds — confirm with a pharmacist."}
      ],
      workouts:[
        {type:"Strength / resistance training",why:"Rising estrogen supports muscle building and recovery — a prime window for heavier lifts."},
        {type:"HIIT or sprint intervals",why:"Energy, power, and tolerance for intensity climb with estrogen."},
        {type:"Cardio / running",why:"Stamina and motivation run high — ideal for building aerobic base."},
        {type:"Dance or group fitness",why:"Your social, playful energy is rising; connected movement feels great."},
        {type:"New / skill-based movement",why:"Sharper coordination and a learning-ready brain make this a great time to try something new."},
        {type:"Power yoga / vinyasa",why:"A dynamic style that matches your upswing while supporting mobility."}
      ],
      foods:[
        {name:"Leafy greens",why:"Folate, iron, and magnesium support new energy and replenish menstruation's losses."},
        {name:"Cruciferous veg",why:"Compounds like indole-3-carbinol support healthy estrogen metabolism as levels rise."},
        {name:"Lean protein",why:"Amino acids fuel the muscle-building your body is primed for."},
        {name:"Fermented foods",why:"Support the gut bacteria (the 'estrobolome') that help process and clear estrogen."},
        {name:"Iron-rich foods",why:"Rebuild iron stores after blood loss to keep energy and focus strong."},
        {name:"Citrus & berries",why:"Vitamin C improves iron absorption; antioxidants support recovery as you train harder."},
        {name:"Fermentable fiber (oats, beans, flax)",why:"Feeds healthy gut bacteria and helps escort used estrogen out."},
        {name:"Whole grains (quinoa, oats)",why:"Steady complex carbs fuel the higher activity and brainpower this phase invites."}
      ],
      teas:[
        {name:"Nettle leaf tea",why:"Gently restocks minerals like iron and magnesium after your period."},
        {name:"Green tea / matcha",why:"Light clean caffeine plus antioxidants complements rising energy."},
        {name:"Red raspberry leaf",why:"A mineral-rich daily sipper for this building phase."},
        {name:"Peppermint tea",why:"Bright and refreshing; supports digestion and the lighter feel of this phase."},
        {name:"Lemon-ginger tea",why:"Warming and circulation-supporting, with vitamin C to aid iron uptake."}
      ],
      supplements:[
        {name:"Iron (if needed)",why:"Restores stores lost during menstruation, supporting energy and focus.",caution:"Only supplement if labs confirm low iron; take with vitamin C, away from coffee/tea."},
        {name:"Magnesium",why:"Supports muscle function, recovery, sleep, and steady energy as activity ramps up.",caution:"Citrate can loosen stools; reduce dose if so."},
        {name:"B-complex (B12 + folate)",why:"Supports energy metabolism and the brainpower this focused phase invites."},
        {name:"Vitamin D3 (with K2)",why:"Supports bone health, mood, and muscle — helpful if you train hard or get little sun.",caution:"Best dosed to a blood level; high doses need oversight."},
        {name:"Omega-3 (EPA/DHA)",why:"Supports mood, recovery, and inflammatory balance during higher training loads.",caution:"Mild blood-thinning — flag if on anticoagulants or before surgery."},
        {name:"Ground flaxseed (1 Tbsp)",why:"Part of 'seed cycling' (evidence is limited) but reliably adds fiber and lignans for estrogen metabolism."}
      ],
      lifestyle:[
        "Front-load your hardest or most creative work and big decisions — confidence is on the upswing.",
        "Start new projects or habits now; follow-through is naturally easier.",
        "Schedule social plans, networking, presentations, first dates — outgoing energy is rising.",
        "Plan and prep nutrient-dense meals so higher activity is well fueled.",
        "Get morning daylight to anchor your rhythm and amplify the energy lift.",
        "Use the momentum to set up systems (meal prep, calendars) you'll lean on later."
      ],
      nervousSystem:[
        "Morning sunlight and a short walk to gently wake the system and steady your rhythm.",
        "A few minutes of slow breathing (longer exhales) to keep rising energy from tipping into wired.",
        "A brief gratitude or intention-setting practice to channel motivation calmly.",
        "Yin or restorative yoga on a rest day to balance higher-intensity training.",
        "Single-tasking and short focus blocks with real breaks so energy stays productive.",
        "A consistent wind-down (screens off, dim light) so an energized day lands in good sleep."
      ],
      eatLess:["Excess caffeine — energy's already rising, so too much tips into jittery.","Heavily processed / ultra-sugary foods — crashes undercut your momentum.","Alcohol — competes with the liver's work and disrupts recovery."],
      affirmation:"I'm rising with my energy — this is my season to begin, build, and bloom."
    },
    {
      key:"ovulatory", phase:"Ovulatory phase", alsoCalled:"The ovulatory window · the “summer” · peak phase",
      typicalDays:"Around Days 14–16 (just before, during, and after the egg releases) — timing shifts cycle to cycle.",
      hormones:"A sharp LH surge — triggered by peak estrogen — actually releases the egg, with a smaller FSH bump alongside. Estrogen crests right before ovulation then dips, while progesterone is still low but beginning its climb.",
      bodyMind:"Usually your brightest, most outward window: energy, confidence, libido, and verbal fluency peak, and you may notice clear stretchy cervical mucus. Your natural energy is for connection, big conversations, high-output work, and your hardest workouts — though some feel a brief mid-cycle twinge or mild bloating.",
      herbs:[
        {name:"Ginger",why:"Warming and anti-inflammatory for any mid-cycle cramping or sluggish digestion."},
        {name:"Nettle leaf",why:"A mineral- and iron-rich tonic supporting your most active phase."},
        {name:"Red raspberry leaf",why:"A traditional uterine tonic many sip across the cycle."},
        {name:"Maca",why:"An adaptogen many find supportive for energy and libido, which peak now.",caution:"Hormone-modulating — check first with a hormone-sensitive condition."},
        {name:"Schisandra berry",why:"Used to support liver detox pathways that clear peaking estrogen.",caution:"Generally avoided in pregnancy."},
        {name:"Peppermint",why:"Cooling and refreshing; settles mild bloating on busy high-energy days."}
      ],
      workouts:[
        {type:"HIIT or sprint intervals",why:"Peak estrogen and energy make this the phase your body is best primed for short, intense bursts."},
        {type:"Heavy strength / lifting PRs",why:"Strength and pain tolerance tend to run high — a great window for top weights."},
        {type:"Group fitness or dance",why:"Your social, outgoing energy thrives in high-vibe settings."},
        {type:"Boxing or kickboxing",why:"Channels the confident, assertive energy into a powerful full-body workout."},
        {type:"Spin / fast cycling",why:"Supports your higher cardiovascular capacity this week."},
        {type:"A brisk hike or run with friends",why:"Pairs steady cardio with the connection your hormones nudge you toward."}
      ],
      foods:[
        {name:"Cruciferous vegetables",why:"Indole-3-carbinol supports the liver's clearance of estrogen as it crests and falls."},
        {name:"Leafy greens",why:"Folate and magnesium fuel egg release and high-energy output."},
        {name:"Berries",why:"Antioxidant- and fiber-rich; mop up oxidative stress and support gentle estrogen clearance."},
        {name:"Ground flaxseed",why:"Lignans and fiber support healthy estrogen metabolism and digestion."},
        {name:"Wild salmon / sardines",why:"Omega-3 fats keep inflammation in check and support hormone quality."},
        {name:"Quinoa / whole grains",why:"Complex carbs and B vitamins give sustained fuel for demanding workouts."},
        {name:"Avocado",why:"Healthy fats and potassium support hormone production and counter mild bloating."},
        {name:"Citrus & bell peppers",why:"Vitamin C supports the corpus luteum and aids iron absorption."}
      ],
      teas:[
        {name:"Green tea",why:"Gentle antioxidants and a clean light lift to match high energy."},
        {name:"Peppermint tea",why:"Refreshing and soothing for mild mid-cycle bloating."},
        {name:"Nettle leaf tea",why:"A mineral-rich tonic that replenishes what intense activity uses up."},
        {name:"Ginger tea",why:"Warming support for any twinge or sluggish digestion around ovulation."},
        {name:"Hibiscus tea",why:"Tart, vitamin-C-rich, antioxidant-packed and hydrating."}
      ],
      supplements:[
        {name:"Magnesium",why:"Supports muscle recovery, energy metabolism, and calm despite the busy pace.",caution:"Glycinate is gentler than citrate on the stomach."},
        {name:"Omega-3 (fish oil)",why:"Keeps inflammation balanced and supports hormone and egg quality.",caution:"Mild blood-thinning — mention before surgery or if on blood thinners."},
        {name:"Vitamin C",why:"Supports the corpus luteum forming post-ovulation and iron absorption."},
        {name:"B-complex",why:"Supports energy production and methylation involved in clearing estrogen."},
        {name:"Calcium D-glucarate",why:"May support the liver's healthy elimination of estrogen as it peaks.",caution:"Hormonally active — check first if on medications, including birth control."},
        {name:"Vitamin D",why:"Supports overall hormone balance and immune function.",caution:"Fat-soluble — test levels rather than guessing at high doses."}
      ],
      lifestyle:[
        "Front-load social plans, dates, and high-stakes conversations into this confident window.",
        "Schedule big presentations, pitches, interviews, or negotiations now.",
        "Hydrate generously to match higher activity and counter mild bloating.",
        "Tackle your most demanding to-dos and creative launches while drive is high.",
        "If tracking fertility: note cervical mucus / LH tests — and use protection if avoiding pregnancy (most fertile window).",
        "Resist over-committing — it's easy to say yes to everything now and crash in luteal."
      ],
      nervousSystem:[
        "A few slow exhales before big conversations to stay centered, not just amped.",
        "Step outside for sunlight and a grounding walk to balance the social-go energy.",
        "A short post-workout cool-down to signal 'safe to rest' after intense effort.",
        "Keep one quiet, screen-free pocket so bright energy doesn't tip into wired.",
        "A brief gratitude or connection practice — relational warmth peaks now.",
        "Wind down with a warm shower and dim lights to protect sleep."
      ],
      eatLess:["Excess caffeine — already high energy can tip into wired.","Heavily processed, high-sodium foods that worsen mid-cycle bloating.","Excess alcohol — adds to the liver's load while it clears peak estrogen."],
      affirmation:"I am radiant, capable, and open — this is my moment to connect and shine."
    },
    {
      key:"luteal", phase:"Luteal phase", alsoCalled:"The “inner autumn” · winding-down phase",
      typicalDays:"Roughly Days 17–28, from just after ovulation until your period begins (often ~12–14 days).",
      hormones:"After ovulation the empty follicle becomes the corpus luteum and pumps out progesterone — your dominant hormone now — while estrogen makes a smaller second rise. If no pregnancy occurs, both fall sharply in the last few days, signaling the next cycle.",
      bodyMind:"Early luteal often feels calm, steady, and capable as progesterone soothes the nervous system — you may crave nesting, tidying, finishing projects. As hormones drop in the back half, it's common to feel more sensitive, tired, bloated, or moody (PMS territory). Your natural energy is for completing rather than starting, and tending to comfort and home.",
      herbs:[
        {name:"Chasteberry (Vitex)",why:"One of the better-studied herbs for easing PMS like breast tenderness and irritability over a few cycles.",caution:"Interacts with hormonal birth control and dopamine meds; not for pregnancy/breastfeeding — check first."},
        {name:"Ginger",why:"Warming and anti-inflammatory for bloating, cramps, and queasiness as your period nears."},
        {name:"Cramp bark",why:"Traditionally used to relax the uterus and ease premenstrual cramping."},
        {name:"Dandelion (leaf/root)",why:"A gentle herb to support the liver and ease premenstrual fluid retention."},
        {name:"Lemon balm",why:"Calming and mood-lifting for the inward, sometimes irritable feel of late luteal.",caution:"May be sedating and affect thyroid in large/long-term doses."},
        {name:"Maca",why:"An adaptogen many find supportive for steady energy through the premenstrual stretch.",caution:"Evidence is limited — treat as a gentle experiment."}
      ],
      workouts:[
        {type:"Steady strength (early luteal)",why:"Lingering hormone support means you can still lift well before energy tapers."},
        {type:"Pilates & barre",why:"Controlled core-focused work matches a body wanting steady effort without high intensity."},
        {type:"Yoga (gentle–moderate)",why:"Supports the calming, inward energy and can ease tension and mood swings."},
        {type:"Brisk walking or hiking",why:"Low-stress movement that lifts mood and eases bloating without taxing a sensitive system."},
        {type:"Swimming / easy cycling",why:"Rhythmic, joint-friendly cardio when high-impact loses its appeal."},
        {type:"Restorative yoga (late luteal)",why:"As your period nears, slowing down honors lower energy and helps the system settle."}
      ],
      foods:[
        {name:"Leafy greens",why:"Magnesium and folate can ease cramps, mood dips, and premenstrual fluid retention."},
        {name:"Pumpkin & sunflower seeds",why:"Magnesium and zinc; many follow seed-cycling by emphasizing them in the luteal half."},
        {name:"Sweet potatoes & squash",why:"Slow-burning carbs steady blood sugar and curb premenstrual cravings."},
        {name:"Salmon / sardines",why:"Omega-3 fats are anti-inflammatory and may ease cramps and low mood."},
        {name:"Cruciferous veg",why:"Support the liver's clearing of estrogen as hormones shift."},
        {name:"Dark chocolate (70%+)",why:"A magnesium-rich way to meet cravings without a big sugar spike."},
        {name:"Bananas",why:"B6, potassium, and magnesium support mood and help with bloating."},
        {name:"Beans & lentils",why:"Fiber, plant iron, and B vitamins keep digestion and blood sugar steady through PMS."}
      ],
      teas:[
        {name:"Chamomile",why:"Calming and mildly antispasmodic; eases tension and sleep troubles."},
        {name:"Ginger tea",why:"Warms the belly and helps with bloating, queasiness, and early cramping."},
        {name:"Peppermint",why:"Soothes premenstrual bloating and digestive upset."},
        {name:"Raspberry leaf",why:"A traditional uterine tonic for the days before your period."},
        {name:"Spearmint",why:"A soft refreshing option some enjoy for hormonal balance and calm."}
      ],
      supplements:[
        {name:"Magnesium",why:"Among the better-supported options for easing PMS cramps, mood, and sleep.",caution:"Can loosen stools and interact with some meds — start low."},
        {name:"Vitamin B6",why:"Reasonable evidence for reducing premenstrual mood symptoms.",caution:"High doses over time can cause nerve tingling — keep sensible."},
        {name:"Calcium",why:"Studied for reducing overall PMS including mood and bloating, especially if intake is low."},
        {name:"Omega-3 (fish oil)",why:"Anti-inflammatory support that may ease cramps and premenstrual mood.",caution:"Mild blood-thinning — flag if on blood thinners or before surgery."},
        {name:"Vitamin D",why:"Supports mood and may lessen PMS; many run low without knowing.",caution:"Best dosed to your own blood level."},
        {name:"Chasteberry (Vitex)",why:"One of the more researched options for cyclical breast tenderness and irritability.",caution:"Interacts with hormonal contraceptives and dopamine meds; not for pregnancy."}
      ],
      lifestyle:[
        "Front-load demanding tasks into early luteal; save the back half for finishing and tidying.",
        "Keep blood sugar steady with regular protein-and-fiber meals to soften cravings and mood swings.",
        "Prioritize sleep and an earlier wind-down as energy dips.",
        "Lower the bar on your to-do list in the premenstrual days and protect downtime.",
        "Stay hydrated; add a pinch of salt or electrolytes for bloating and fatigue.",
        "Plan ahead for your period: stock supplies, prep easy meals, lighten your calendar."
      ],
      nervousSystem:[
        "Slow nasal breathing or a longer exhale to shift into rest-and-digest.",
        "A warm bath or heating pad on the belly or lower back for comfort.",
        "Gentle restorative poses like legs-up-the-wall or child's pose.",
        "Journaling or a brain-dump to move premenstrual worry out of your head.",
        "Earlier, dimmer evenings with less screen time to protect sleep.",
        "Self-massage or simply slowing your pace to honor the inward pull."
      ],
      eatLess:["Caffeine — can worsen anxiety, breast tenderness, and sleep trouble now.","Alcohol — disrupts sleep and mood and often hits harder premenstrually.","Heavily salted / ultra-processed foods that amp up bloating.","Refined sugar — spikes and crashes energy and feeds cravings."],
      affirmation:"I am allowed to slow down, finish gently, and care for myself as my body turns inward."
    }
  ],

  tracking:{
    moods:["Depleted","Foggy","Tender","Anxious","Irritable","Flat","Steady","Content","Calm","Connected","Energized","Radiant"],
    symptoms:["Cramps","Bloating","Headache","Breast tenderness","Acne","Low energy","Anxiety","Irritability","Cravings","Poor sleep","Back/hip pain","Nausea","Digestive changes","Temp shifts","Low libido","Sore body"],
    energyScaleLabel:"How's your energy today?",
    dailyHabits:[
      {habit:"Protein within an hour of waking",why:"Steadies blood sugar so cortisol and energy don't spike and crash."},
      {habit:"10 minutes of morning daylight",why:"Anchors the rhythm that times cortisol, melatonin, and reproductive hormones."},
      {habit:"Water with a pinch of minerals",why:"Supports adrenal function and eases bloating, cramps, and fatigue."},
      {habit:"Move your body gently",why:"Improves insulin sensitivity and clears excess hormones while calming the system."},
      {habit:"One nervous-system reset",why:"Down-regulates stress so your body can prioritize hormone balance."},
      {habit:"Fiber + a leafy/cruciferous veg",why:"Helps the gut and liver clear used estrogen so it doesn't recirculate."},
      {habit:"Stop caffeine by early afternoon",why:"Protects deep sleep and keeps cortisol from staying elevated."},
      {habit:"Screen-free 20 min before bed",why:"Raises melatonin and supports the overnight repair hormones depend on."},
      {habit:"7–9 hours of sleep, consistent times",why:"Sleep is when hormones reset and the nervous system recovers."}
    ],
    logPrompts:[
      "What is your body asking you for today, and can you give it one small thing?",
      "Name one moment today that felt steadying or kind to your nervous system.",
      "What drained you today, and what (if anything) restored you?",
      "If today's energy were a message about where you are in your cycle, what would it say?"
    ]
  },

  ns:{
    overview:"Your hormones and your nervous system are in constant conversation. When you live in fight-or-flight, your body keeps cortisol high — and chronic cortisol pulls resources away from your sex hormones, thyroid, and blood-sugar balance. The good news: you can actively signal safety. Spending real time each day in rest-and-digest lowers the stress load so your hormones have the calm, steady environment they need to regulate.",
    morningRituals:[
      {name:"Morning sunlight before screens",how:"Within 30–60 min of waking, get 5–10 min of outdoor light on your face and eyes (no sunglasses). Sets cortisol to peak in the morning and fall at night.",minutes:10},
      {name:"Feet-on-the-floor grounding breath",how:"Before your phone, sit on the edge of the bed, feet flat, and take 6 slow breaths with a longer exhale. Tells your body you're safe before the day's demands.",minutes:2},
      {name:"Warm water + protein-first breakfast",how:"Start with warm water, then a breakfast built around 25–30g protein within an hour or two. Stable morning blood sugar prevents cortisol spikes.",minutes:15},
      {name:"Gentle movement, not a workout",how:"5 minutes of easy mobility — neck rolls, cat-cow, a slow walk. Wakes the body without flooding it with stress chemicals.",minutes:5},
      {name:"One-line intention, hand on heart",how:"Hand on heart, one slow breath, name one intention or gratitude. The light pressure and slow breath cue the vagus nerve.",minutes:2}
    ],
    eveningRituals:[
      {name:"Dim the lights after sunset",how:"Switch to lamps / warm light 1–2 hrs before bed and put screens away. Dimness signals melatonin to rise and cortisol to fall.",minutes:5},
      {name:"Extended-exhale breathing",how:"In bed, inhale 4, exhale 8 — repeat several rounds. The long exhale activates the vagus nerve for sleep.",minutes:5},
      {name:"Legs-up-the-wall",how:"Lie on your back, legs up a wall, arms relaxed, breathe slowly for a few minutes. Calms the system and releases the day's tension.",minutes:8},
      {name:"Warm shower / bath, then cool room",how:"Warm shower ~60–90 min before bed. The post-warmth temperature drop in a cool dark room is a powerful sleep trigger.",minutes:15},
      {name:"Brain-dump + tomorrow's top 3",how:"Write what's looping in your mind and the 3 things that matter tomorrow, then close the notebook. Keeps the stress response from firing at bedtime.",minutes:5}
    ],
    dailyNonNegotiables:[
      "Get 5–10 min of natural morning light within an hour of waking.",
      "Eat a protein-forward breakfast (25–30g) and pair carbs with protein/fat/fiber all day.",
      "Move your body daily in a way that feels good (a walk counts).",
      "Cut off caffeine by early afternoon (and never on an empty stomach first thing).",
      "Take at least one intentional parasympathetic break before you feel maxed out.",
      "Protect a consistent wind-down and bedtime, aiming for 7–9 hours.",
      "Set one real boundary a day — a 'no,' a phone-free hour, stepping back from a draining input."
    ],
    signsDysregulated:["Wired-but-tired — exhausted yet unable to settle","Racing heart, shallow breathing, tight jaw/shoulders","Cravings for sugar, salt, or caffeine; energy crashes","Irritable, anxious, on-edge, quick to snap","Brain fog or a mind that won't quiet","Cold hands or feet","Digestive upset — bloating or appetite swings"],
    signsRegulated:["Slower, fuller belly breathing without trying","Warm hands and feet","Relaxed jaw, soft shoulders, open face","Steady even energy without big crashes","Easier digestion and comfortable appetite","A calm mind that can focus and also rest","Falling asleep with ease and waking restored"]
  },

  /* ---- breathwork + meditation (researched, evidence-noted) ---- */
  breath:{patterns:[
    {key:"coherence",name:"Coherent Breathing",tagline:"The steady, even rhythm that brings body and mind into balance.",benefit:"Breathing at ~5.5 breaths/min hits the body's resonance frequency, maximizing respiratory sinus arrhythmia and raising heart-rate variability (HRV) — shifting you toward parasympathetic (vagal) dominance.",bestFor:["Daily baseline","Building HRV & resilience","Emotional regulation","Pre-performance centering"],contraindication:"",evidenceNote:"Strong and growing. RCTs and meta-analyses link ~5–6 breaths/min to acute HRV increases and modest drops in blood pressure and anxiety.",defaultMinutes:5,steps:[{label:"Breathe in",seconds:5.5,kind:"in"},{label:"Breathe out",seconds:5.5,kind:"out"}]},
    {key:"physiologicalSigh",name:"Physiological Sigh",tagline:"Two breaths in, one long breath out — the fastest way to take the edge off.",benefit:"The second short inhale re-inflates collapsed alveoli, and the long exhale offloads CO₂ while lengthening the parasympathetic 'brake' on the heart — rapidly downshifting acute stress.",bestFor:["Acute anxiety or stress","Resetting in under 1–2 min","Before a hard conversation","Interrupting a thought spiral"],contraindication:"",evidenceNote:"Promising. A 2023 Stanford RCT (Balban et al., Cell Reports Medicine) found 5 min/day of cyclic sighing improved mood and lowered respiratory rate, outperforming mindfulness in that trial.",defaultMinutes:2,steps:[{label:"Breathe in fully",seconds:2,kind:"in"},{label:"Sip a little more air in",seconds:1,kind:"sip"},{label:"Long, slow breathe out",seconds:6,kind:"out"}]},
    {key:"extendedExhale",name:"Extended Exhale",tagline:"Make every out-breath longer than the in-breath to soften and settle.",benefit:"A longer exhale than inhale (~1:2) engages the vagus nerve and slows heart rate on the out-breath, tilting you toward 'rest and digest' without breath holds.",bestFor:["Evening wind-down","Gentle anxiety relief","Transitioning out of a busy day","Anyone who dislikes breath holds"],contraindication:"",evidenceNote:"Solid. Prolonged-exhalation breathing reliably increases vagal tone and HRV in lab studies; one of the most accessible slow-breathing techniques.",defaultMinutes:5,steps:[{label:"Breathe in",seconds:4,kind:"in"},{label:"Breathe out",seconds:8,kind:"out"}]},
    {key:"box",name:"Box Breathing",tagline:"Four equal sides — in, hold, out, hold — for steady, grounded focus.",benefit:"Equal-ratio breathing with held lungs slows respiration and gently builds CO₂ tolerance; the symmetric, countable structure also anchors attention and quiets mental chatter.",bestFor:["Focus & clarity","Performance pressure","Staying composed under stress","A structured midday reset"],contraindication:"Ease the holds (or choose Extended Exhale) during pregnancy, with uncontrolled blood pressure, or any condition where breath-holding is advised against.",evidenceNote:"Moderate. Well supported as slow-paced breathing generally; box-specific trials are smaller.",defaultMinutes:4,steps:[{label:"Breathe in",seconds:4,kind:"in"},{label:"Hold",seconds:4,kind:"holdFull"},{label:"Breathe out",seconds:4,kind:"out"},{label:"Hold",seconds:4,kind:"holdEmpty"}]},
    {key:"fourSevenEight",name:"4-7-8 Breath",tagline:"A long hold and an even longer exhale to drift toward sleep.",benefit:"The extended exhale and breath retention strongly activate the parasympathetic nervous system and slow the heart, while the counting occupies the mind — quieting pre-sleep arousal.",bestFor:["Falling asleep","Nighttime wake-ups","Deep wind-down","Calming high anxiety"],contraindication:"Skip or shorten the 7-second hold during pregnancy, with low blood pressure, or if lightheaded. Best done seated or lying down, never while driving.",evidenceNote:"Limited but encouraging. A few small studies suggest acute drops in heart rate and blood pressure; treat as a helpful ritual rather than a proven cure.",defaultMinutes:4,steps:[{label:"Breathe in through the nose",seconds:4,kind:"in"},{label:"Hold",seconds:7,kind:"holdFull"},{label:"Breathe out through the mouth",seconds:8,kind:"out"}]},
    {key:"gentleCalm",name:"Gentle Calm",tagline:"An easy, unhurried breath anyone can do, anytime.",benefit:"A relaxed ~6 breaths/min pace with a slightly longer exhale nudges the nervous system toward calm and lifts HRV, with no holds and no strain.",bestFor:["Beginners","Everyday calm","A gentle moment of self-care","Pregnancy or when holds feel like too much"],contraindication:"",evidenceNote:"Strong for the principle. Slow breathing near 6/min with a longer exhale is among the best-supported, lowest-risk relaxation practices.",defaultMinutes:5,steps:[{label:"Breathe in",seconds:4,kind:"in"},{label:"Breathe out",seconds:6,kind:"out"}]},
    {key:"alternateNostril",name:"Alternate-Nostril Breath",tagline:"Breathe in one nostril and out the other to feel centered and clear.",benefit:"Closing one nostril at a time (gently with a fingertip) slows and balances the breath; the side-switching rhythm promotes parasympathetic activity and a felt sense of balance.",bestFor:["Calm, clear focus","Settling a scattered mind","A pre-meditation ritual","Balancing energy without stimulation"],contraindication:"Skip if your nose is congested; keep the pace comfortable during pregnancy.",evidenceNote:"Moderate. Studies of Nadi Shodhana report improved HRV, lower blood pressure, and better attention, though many are small.",defaultMinutes:5,steps:[{label:"In — left nostril",seconds:4,kind:"in"},{label:"Out — right nostril",seconds:6,kind:"out"},{label:"In — right nostril",seconds:4,kind:"in"},{label:"Out — left nostril",seconds:6,kind:"out"}]}
  ]},

  meditations:[
    {key:"arriving-3min",name:"Arriving: A Daily Reset",theme:"grounding",durationMin:3,description:"A short grounding practice to drop out of the day's momentum and back into your body.",cues:[
      {atSeconds:0,text:"Welcome. Let your eyes soften or close. You've arrived — that's enough."},
      {atSeconds:22,text:"Feel where your body meets the surface beneath you. Let it hold your weight."},
      {atSeconds:48,text:"Take a slow breath in through the nose... and a longer breath out."},
      {atSeconds:78,text:"Notice three things you can hear, near or far. Just listen, without naming them."},
      {atSeconds:108,text:"Let your shoulders drop a little. Unclench your jaw. Nothing to fix right now."},
      {atSeconds:138,text:"One more easy breath in... and a long, releasing breath out."},
      {atSeconds:165,text:"You're here, in this moment. Carry this calm with you as you return."}
    ]},
    {key:"body-scan-5min",name:"Releasing Tension: A Body Scan",theme:"body-scan",durationMin:5,description:"A head-to-toe scan that softens held tension and guides your system into rest-and-restore.",cues:[
      {atSeconds:0,text:"Settle in. Let your body be fully supported, and gently close your eyes."},
      {atSeconds:25,text:"Breathe in slowly... and let the exhale be long and soft. Let it signal: you're safe."},
      {atSeconds:55,text:"Bring your attention to your forehead and eyes. Let everything there go smooth."},
      {atSeconds:90,text:"Soften your jaw. Let your tongue rest. Release the space behind your ears."},
      {atSeconds:125,text:"Let your shoulders melt away from your ears. Feel them grow heavy."},
      {atSeconds:160,text:"Notice your chest and belly rising and falling. Let the belly be soft."},
      {atSeconds:195,text:"Release your hands. Unfurl the fingers. Let your arms feel weighted and still."},
      {atSeconds:230,text:"Soften your hips and the small of your back. Let them sink and surrender."},
      {atSeconds:262,text:"Let the softening travel down your legs... all the way to your feet."},
      {atSeconds:290,text:"Feel your whole body at rest now. One more slow breath out."}
    ]},
    {key:"self-compassion-5min",name:"A Kindness Practice for the Tender Days",theme:"self-compassion",durationMin:5,description:"A loving-kindness practice for meeting yourself with warmth — especially in the premenstrual days.",cues:[
      {atSeconds:0,text:"Find a comfortable place to rest. Let your hands settle wherever feels kind."},
      {atSeconds:28,text:"If it feels right, place a hand over your heart. Feel its steady warmth."},
      {atSeconds:60,text:"Take a breath, and notice however you're feeling today. No need to change it."},
      {atSeconds:95,text:"Whatever is here — tenderness, heaviness, fatigue — let it be welcome."},
      {atSeconds:130,text:"Silently offer yourself: May I be gentle with myself today."},
      {atSeconds:168,text:"May I have patience with what I'm feeling."},
      {atSeconds:205,text:"May I give myself the same kindness I'd give a dear friend."},
      {atSeconds:242,text:"Picture someone who loves you offering that warmth back to you now."},
      {atSeconds:275,text:"You are allowed to rest. You are allowed to be exactly as you are."},
      {atSeconds:298,text:"Take one full breath, and carry this softness with you."}
    ]},
    {key:"sleep-winddown-7min",name:"Settling Into Sleep",theme:"sleep",durationMin:7,description:"A slow wind-down to release the day and ease your body and mind toward sleep.",cues:[
      {atSeconds:0,text:"Lie back and let yourself be held by the bed. The day is done now."},
      {atSeconds:30,text:"Let your eyes close. There's nothing left to do tonight."},
      {atSeconds:65,text:"Breathe in gently... and let the breath out slow, like a quiet sigh."},
      {atSeconds:105,text:"With each exhale, feel yourself sinking a little deeper into the mattress."},
      {atSeconds:150,text:"Let your face soften. Your jaw, your brow, the space between your eyes."},
      {atSeconds:195,text:"Let your shoulders and arms grow heavy. Let them be done holding anything."},
      {atSeconds:240,text:"If thoughts drift in, that's okay. Let them float past like clouds."},
      {atSeconds:285,text:"Feel your legs grow heavy and warm. Your whole body, slowing down."},
      {atSeconds:330,text:"Breathe out, longer and softer now. There's nowhere to be but here."},
      {atSeconds:372,text:"Let your breath find its own quiet rhythm. You don't need to follow it."},
      {atSeconds:405,text:"Rest now. Let sleep come to meet you. You are safe, and you can let go."}
    ]},
    {key:"cycle-attuned-5min",name:"Honoring Your Season",theme:"cycle-attuned",durationMin:5,description:"A practice for meeting your body where it is in its cycle — resting through winter, rising through spring.",cues:[
      {atSeconds:0,text:"Settle in, and take a slow breath. Let yourself arrive in your body as it is today."},
      {atSeconds:30,text:"Your body moves through seasons, like the earth. There is no wrong one to be in."},
      {atSeconds:68,text:"Gently ask: where am I today? Resting in winter, or rising in spring?"},
      {atSeconds:105,text:"If it's winter — low energy, turning inward — let that be wise, not wrong."},
      {atSeconds:145,text:"Winter asks for rest. Let yourself soften, slow down, and draw inward."},
      {atSeconds:185,text:"If it's spring — energy returning, opening outward — feel that quiet lift."},
      {atSeconds:222,text:"Spring invites you forward. You can meet it without rushing it."},
      {atSeconds:258,text:"Wherever you are, your body is not asking to be fixed. Only to be honored."},
      {atSeconds:285,text:"Place a hand on your belly. Thank your body for its quiet wisdom."},
      {atSeconds:300,text:"Breathe in, and return — trusting the season you're in."}
    ]}
  ],

  practiceMap:{
    byPhase:[
      {phaseKey:"menstrual",recommendedBreath:["extendedExhale","coherence","gentleCalm"],recommendedMeditation:["body-scan-5min","self-compassion-5min","arriving-3min"],why:"Energy is at its lowest — a turn-inward, rest-and-release window. Long exhales and slow coherent breathing downshift the nervous system, while body scan and self-compassion meet cramps and tenderness with kindness."},
      {phaseKey:"follicular",recommendedBreath:["coherence","box","alternateNostril"],recommendedMeditation:["arriving-3min","cycle-attuned-5min","body-scan-5min"],why:"Rising estrogen brings fresh energy and focus, so practices can be a touch more structured. Balanced, rhythmic breathing channels the natural lift into intention rather than scatter."},
      {phaseKey:"ovulatory",recommendedBreath:["coherence","box","alternateNostril"],recommendedMeditation:["arriving-3min","self-compassion-5min","cycle-attuned-5min"],why:"Energy and social drive peak — steadying, balancing practices keep the high from tipping into overstimulation, while self-compassion guards against the pressure to always be 'on.'"},
      {phaseKey:"luteal",recommendedBreath:["extendedExhale","fourSevenEight","physiologicalSigh","gentleCalm"],recommendedMeditation:["self-compassion-5min","body-scan-5min","sleep-winddown-7min","cycle-attuned-5min"],why:"Falling progesterone often brings PMS, irritability, and disrupted sleep — the emphasis shifts to calming and downregulating. Extended exhales and the physiological sigh quell tension; self-compassion and sleep soften the wind-down."}
    ],
    reminders:{
      meditationCopy:[
        "Your body's asking for a pause. Two quiet minutes, whenever you're ready.",
        "No pressure today — just a soft landing if you want one. Your meditation's here.",
        "Wherever you are in your cycle, you deserve a moment that's only yours.",
        "A little stillness goes a long way right now. Want to take five?",
        "You don't have to earn rest. It's already yours — come sit for a minute.",
        "Today's practice is matched to your phase. Meet yourself exactly where you are.",
        "Even a tiny check-in counts. Your mind would love a few breaths of quiet.",
        "This is your gentle nudge, not a to-do. Open it only if it feels good."
      ],
      breathCopy:[
        "One slow breath. That's the whole ask. Ready?",
        "Shoulders down, jaw soft — let's take three breaths together.",
        "Feeling wound up? A 60-second reset is right here.",
        "Long exhale, longer than the inhale. Let's reset your nervous system.",
        "Pause for a sigh. One deep inhale, one full letting-go.",
        "A quick breath break can change the whole hour. Tap when you're set.",
        "Your phase loves a slow exhale today. Want to try one?",
        "Stressful moment? Breathe with me for a minute — that's all it takes."
      ],
      microPractices:[
        {name:"Three-Sigh Reset",seconds:40,how:"Breathe in, sip a little more air on top, then a long slow exhale. Repeat three times. The double-inhale sigh quickly calms a racing mind.",pattern:"physiologicalSigh"},
        {name:"Exhale Twice as Long",seconds:60,how:"Breathe in for 4, out for 8. Do five rounds. The extended exhale flips on the body's rest response.",pattern:"extendedExhale"},
        {name:"Hand-on-Heart Check-In",seconds:60,how:"One hand on your heart, one on your belly. Three soft breaths, and silently offer yourself: 'I'm doing my best today.'",pattern:"gentleCalm"},
        {name:"Five Senses Grounding",seconds:90,how:"Name five things you see, four you hear, three you feel, two you smell, one you taste. Pulls you back into the present.",pattern:null}
      ]
    },
    progression:{
      idea:"Progression is a relationship you're tending, not a streak you can shatter. Missing a day never resets you to zero — and rest during your period or low-energy luteal days counts as honoring your body. Returning after a gap is always welcomed, never scolded.",
      milestones:[
        {at:1,text:"First breath, first calm — you showed up once, and that's the whole beginning."},
        {at:3,text:"Three gentle days of meeting yourself."},
        {at:7,text:"A full week of tending your practice."},
        {at:15,text:"You're learning your own rhythm."},
        {at:30,text:"30 mindful moments gathered, at your own pace."},
        {at:60,text:"You're building something that lasts."}
      ]
    }
  },

  safety:{
    disclaimer:"Gata shares general wellness and cycle education — not medical advice. It's not a substitute for a relationship with a qualified healthcare provider who knows your history. Herbs and supplements are real, active substances that can interact with medications and aren't right for everyone. Please talk with your doctor, pharmacist, or another trusted clinician before starting anything new — especially if you're pregnant, trying to conceive, breastfeeding, taking any medication, or managing a health condition. If something feels off in your body, trust that and check in with a professional.",
    talkToDoctorIf:[
      "You are pregnant, might be, or are trying to conceive — several herbs here (chasteberry, maca, schisandra, raspberry leaf, high-dose ginger, milk thistle) aren't established as safe in pregnancy.",
      "You are breastfeeding — safety data is limited and some herbs (e.g. chasteberry) may affect milk supply.",
      "You take hormonal birth control or hormone therapy — chasteberry, maca, and other hormonally active herbs could interfere.",
      "You take an antidepressant or anti-anxiety medication — chasteberry, schisandra, and ashwagandha can interact.",
      "You take a blood thinner / antiplatelet or have a bleeding disorder, or have surgery coming up — fish oil, ginger, flaxseed, nettle can add to bleeding risk.",
      "You have a liver condition or take liver-metabolized medication — milk thistle, schisandra, ashwagandha can affect liver enzymes.",
      "You have a thyroid, diabetes, low-blood-pressure, or autoimmune condition — ashwagandha and maca can affect these.",
      "You want to take iron — only supplement after a blood test confirms you need it; too much is genuinely harmful."
    ],
    flaggedItems:[
      {name:"Chasteberry (Vitex)",concern:"Hormonally and dopaminergically active. May interfere with hormonal birth control, hormone therapy, and fertility treatment; interacts with dopamine drugs; not for pregnancy.",recommendation:"Don't use if pregnant, on hormonal birth control, on fertility meds, or taking antipsychotic/antidepressant drugs without your doctor's okay."},
      {name:"Ashwagandha",concern:"Can lower blood sugar and blood pressure, alter thyroid levels, and be sedating. May stimulate the immune system. Rare liver-injury reports. Not for pregnancy.",recommendation:"Avoid in pregnancy and while trying to conceive. Talk to your doctor first with a thyroid, autoimmune, blood-sugar, or liver condition, or on sedatives/thyroid meds."},
      {name:"Milk thistle",concern:"Active on the liver; can affect drug-metabolizing enzymes and change blood levels of medications. Ragweed-allergy cross-reaction possible.",recommendation:"Check with your doctor/pharmacist before use if you take any regular medication, have a liver condition, or are pregnant."},
      {name:"Omega-3 fish oil",concern:"At higher doses has a mild blood-thinning effect that adds to anticoagulants, antiplatelets, daily aspirin, and surgery risk.",recommendation:"Keep to typical doses. If on a blood thinner/aspirin or with surgery scheduled, clear the dose with your clinician."},
      {name:"Ginger",concern:"At concentrated supplement doses (not culinary/tea amounts) it can mildly thin blood and lower blood sugar and pressure.",recommendation:"Food and tea amounts are fine for most. Check first if using capsules alongside blood thinners, diabetes, or BP meds, or before surgery."},
      {name:"Ground flaxseed",concern:"Phytoestrogens are weakly hormonally active; fiber/oils can slow absorption of medications taken at the same time; high intake may add to bleeding risk.",recommendation:"Generally safe as food. Take meds a couple hours apart from flax; check first with a hormone-sensitive condition or blood thinners."},
      {name:"Iron",concern:"Should only be supplemented when bloodwork shows need — excess is harmful and dangerous in overdose. Interacts with thyroid meds, some antibiotics, and antacids.",recommendation:"Only supplement after a blood test confirms low iron, ideally with clinician guidance. Separate from thyroid meds, antibiotics, antacids by several hours."},
      {name:"Schisandra berry",concern:"Affects liver enzymes and can alter how many medications are metabolized. Traditionally uterine-stimulating; avoided in pregnancy.",recommendation:"Avoid in pregnancy. Check with a pharmacist/doctor before use if on any regular medication or with a liver condition."},
      {name:"Maca root",concern:"May have estrogenic-like effects; not well studied in pregnancy or with hormone therapy/birth control. Raw maca contains goitrogens (thyroid).",recommendation:"Discuss with your doctor before use if pregnant, trying to conceive, on hormonal birth control/therapy, or with a hormone-sensitive or thyroid condition."},
      {name:"Nettle leaf",concern:"Mild diuretic; may lower blood sugar and pressure; vitamin K content can oppose warfarin; traditionally cautioned in pregnancy.",recommendation:"Use food/tea amounts cautiously. Check first if on warfarin, diuretics, BP or diabetes meds, or pregnant."},
      {name:"Raspberry leaf",concern:"Traditionally uterine-toning and may stimulate uterine activity; commonly advised to avoid in early pregnancy.",recommendation:"If pregnant or trying to conceive, talk to your midwife or doctor before using."},
      {name:"Vitamin D / D3 (with K2)",concern:"Fat-soluble and can build up to toxic levels with high or stacked doses. K2 can interfere with warfarin. High intake can raise calcium.",recommendation:"Use one source and a sensible dose; ideally test your level first. Confirm with your doctor if on warfarin or a calcium supplement."},
      {name:"Calcium",concern:"Reduces absorption of thyroid meds, some antibiotics, and iron when taken together; very high intake with vitamin D can raise blood calcium.",recommendation:"Separate calcium from iron, thyroid meds, and antibiotics by a few hours. Don't exceed recommended amounts."},
      {name:"Vitamin B6",concern:"High doses over time can cause peripheral nerve damage (tingling/numbness); easy to overshoot when B6 is also in a B-complex.",recommendation:"Keep total B6 from all products well within recommended limits; don't stack standalone B6 on a B-complex."},
      {name:"Calcium D-glucarate",concern:"Marketed to influence estrogen clearance, so theoretically hormonally active and may affect hormonal medications. Limited human data.",recommendation:"Talk to your doctor before use if on hormonal birth control/therapy or any medication, or if pregnant or trying to conceive."}
    ],
    generalCautions:[
      "Start one new supplement at a time and give it a couple of weeks — so you know what's working or not.",
      "Watch for reactions — rash, itching, stomach upset, headache, mood/sleep changes, unusual bleeding. Stop and check in if anything new shows up.",
      "Quality matters: choose reputable brands with third-party testing (USP, NSF, or an independent COA).",
      "Watch for overlap — several items repeat the same nutrients (B6, D, iron, omega-3, calcium). Add up everything so you don't exceed safe limits.",
      "Bring a full list of supplements, doses, and medications to your doctor or pharmacist to screen for interactions, and pause before any surgery unless told otherwise."
    ]
  }
};
