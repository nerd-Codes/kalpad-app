// /src/lib/onboardingSteps.js

const onboardingSteps = [
  {
    target: '#new-plan-button',
    title: 'Welcome, Padhaku!',
    body: "Your journey begins here. Let's build your first battle plan.",
    placement: 'bottom',
    route: '/dashboard',
    nextRoute: '/new-plan', // Add a hint for the next navigation
    advancesOnAction: true,
  },
  {
    target: '#exam-name-input', // New Target
    title: 'Step 1: The Goal',
    body: "First, give your mission a name. What are we conquering? (e.g., 'Final Exams', 'Project X')",
    placement: 'bottom',
    route: '/new-plan',
  },
  {
    target: '#exam-date-input', // New Target
    title: 'Step 2: The Deadline',
    body: "Every mission has a deadline. When is your D-Day?",
    placement: 'right',
    route: '/new-plan',
  },
   {
    target: '#study-hours-input', // New Target
    title: 'Step 3: Your Commitment',
    body: "How many hours can you *realistically* commit per day? Be honest, the AI will adapt.",
    placement: 'right',
    route: '/new-plan',
  },
  {
    target: '#syllabus-input',
    title: 'Step 4: The Battlefield',
    body: "Paste your entire syllabus or list of topics here. Don't worry if it's messy—the AI will make sense of the chaos.",
    placement: 'top',
    route: '/new-plan',
  },
  {
    target: '#plan-mode-selector',
    title: 'Step 5: Choose Your Brain',
    body: "This is our secret weapon. Each mode is a different AI persona with a unique strategy.",
    placement: 'bottom',
    route: '/new-plan',
    action: 'open_mode_modal',
    pausesTour: true,
    advancesOnAction: true,
  },
{
    target: '#generate-plan-button',
    title: 'Step 6: Unleash the Magic',
    body: 'Ready? Hit this button and watch the AI build your entire plan in real-time. This is where the chaos ends.',
    placement: 'top',
    route: '/new-plan',
    advancesOnAction: true,
    pausesTour: true // <-- DEFINITIVE ADDITION
},

// --- ADD A NEW, FINAL STEP for the "Save Plan" nudge ---
{
    target: '#save-plan-button', // We will add this ID next
    title: 'Final Step: Save Your Plan',
    body: "Looks good? Don't forget to Save your plan to access all the features, like the Notes Generator and Smart Quizzes!",
    placement: 'top',
    route: '/new-plan'
}
];

export default onboardingSteps;