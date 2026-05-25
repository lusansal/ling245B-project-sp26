// Global operational runtime calculation state variables
let completedTestTrials = 0;
let totalTestTrialsCount = 0;
let historicLanguage = null;

// Initialize jsPsych Session Object (Cleaned for Cognition.run)
const jsPsych = initJsPsych({
  show_progress_bar: true,
  auto_update_progress_bar: false,
  
  // Triggers when the experiment is completed
  on_finish: function() {
    // Read the URL variables safely using jsPsych functions
    const prolificPID = jsPsych.data.getURLVariable('PROLIFIC_PID');

    // Check if the participant came from Prolific
    if (prolificPID) {
        // 1. Show a loader screen so they don't exit manually
        document.body.innerHTML = '<div style="text-align:center; padding-top:20%; font-family: sans-serif;"><h3>Saving data and redirecting to Prolific...</h3><p>Please do not close this window.</p></div>';
        
        // 2. Wait exactly 2.5 seconds (2500ms) so Cognition logs a "completed" status instead of "dropped"
        setTimeout(function() {
            // Replace XXXXXXXX with your actual Prolific completion code
            window.location.href = "https://app.prolific.com/submissions/complete?cc=C1NSKUIM";
        }, 2500); 

    } else {
        // Standard thank you screen for regular web participants
        document.body.innerHTML = '<div style="text-align:center; padding-top:20%; font-family: sans-serif;"><h3>Thank you for completing the study!</h3><p>You may now close this window.</p></div>';
    }
  }
});

// 1. Safely extract Prolific parameters from the URL strings
const prolific_pid = jsPsych.data.getURLVariable('PROLIFIC_PID');
const study_id = jsPsych.data.getURLVariable('STUDY_ID');
const session_id = jsPsych.data.getURLVariable('SESSION_ID');

// 2. Generate a random fallback ID if they are not from Prolific
const participant_id = prolific_pid || jsPsych.randomization.randomID(8);

// 3. Bind all three Prolific trackers permanently into your Cognition data table
jsPsych.data.addProperties({
  participant_id: participant_id,
  prolific_pid: prolific_pid, // Evaluates to null for regular web traffic
  study_id: study_id,         // Evaluates to null for regular web traffic
  session_id: session_id      // Evaluates to null for regular web traffic
});

// --- INTER-SUBJECT RANDOM ASSIGNMENT GENERATOR ---
const PARTICIPANT_GROUP = jsPsych.randomization.sampleWithoutReplacement([1, 2], 1)[0];

// Operational Interval Timing Calculations (500ms vs 800ms)
const TOTAL_SOA = (PARTICIPANT_GROUP === 1) ? 500 : 800;
const CUE_DURATION = TOTAL_SOA; 

jsPsych.data.addProperties({
  assigned_experimental_group: PARTICIPANT_GROUP,
  session_total_soa: TOTAL_SOA
});

// Exact Target Picture Stimuli Set Manifest
const verbalStimuli = [
  { name: 'dog',    src: 'dog.png' },
  { name: 'cheese', src: 'cheese.png' },
  { name: 'window', src: 'window.png' },
  { name: 'knife',  src: 'knife.png' },
  { name: 'leaf',   src: 'leaf.png' },
  { name: 'table',  src: 'table.png' },
  { name: 'apple',  src: 'apple.png' },
  { name: 'hat',    src: 'hat.png' },
  { name: 'carrot', src: 'carrot.png' },
  { name: 'rain',   src: 'rain.png' }
];

const preloadImages = verbalStimuli.map(item => item.src);
const activeLanguages = ['L1', 'L2'];
const responseKeyMap = {
  dog:    { L1: 'd', L2: 'p' },
  cheese: { L1: 'c', L2: 'q' },
  window: { L1: 'w', L2: 'v' },
  knife:  { L1: 'k', L2: 'c' },
  leaf:   { L1: 'l', L2: 'h' },
  table:  { L1: 't', L2: 'm' },
  apple:  { L1: 'a', L2: 'm' },
  hat:    { L1: 'h', L2: 's' },
  carrot: { L1: 'c', L2: 'z' },
  rain:   { L1: 'r', L2: 'l' }
};
let masterTimeline = [];

// Media Asset Preloader
masterTimeline.push({
  type: jsPsychPreload,
  images: preloadImages,
  message: 'Loading visual picture matrix. Please stand by...'
});

// Explicit Instructional Directives Block
const taskInstructions = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function() {
    return `
      <div style="max-width: 650px; text-align: left; line-height: 1.8; font-size: 18px;">
        <h3>Instructions</h3>
        <p>In this experiment, you will see images preceded by a colored indicator circle.</p>
        <p>The colored circle informs you which <strong>language</strong> you must use to name the object:</p>
        <ul>
          <li><strong style="color: #D90429;">RED CIRCLE</strong>: Respond in your <strong>L1 (English)</strong>.</li>
          <li><strong style="color: #0077B6;">BLUE CIRCLE</strong>: Respond in your <strong>L2 (Spanish)</strong>.</li>
        </ul>
        <p>For each image, press the <strong>first letter</strong> of the correct word in the cued language as quickly as possible.</p>
        <p>Example: For an image of a <strong>dog</strong>, you would press <strong>d</strong> if cued with RED (English), or <strong>p</strong> if cued with BLUE (Spanish: <em>perro</em>).</p>
        <br />
        <p style="text-align: center; color: #0077B6; font-weight: bold;">We will start with 3 short practice trials with correctness feedback.</p>
        <p style="text-align: center; font-weight: bold; color: #555;">Press the SPACEBAR to begin the practice block.</p>
      </div>
    `;
  },
  choices: [' ']
};
masterTimeline.push(taskInstructions);

// --- GENERATE PRACTICE TIMELINE ENTRIES ---
let practicePool = [];
verbalStimuli.forEach(item => {
  activeLanguages.forEach(lang => {
    practicePool.push({ item: item, language: lang });
  });
});

let practiceConditions = jsPsych.randomization.sampleWithoutReplacement(practicePool, 3);

practiceConditions.forEach((trialProfile) => {
  masterTimeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="experiment-container"><div style="font-size: 50px; color: #bbb;">+</div></div>',
    choices: "NO_KEYS",
    trial_duration: 500
  });

  masterTimeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const colorClass = (trialProfile.language === 'L1') ? 'cue-red' : 'cue-blue';
      return `<div class="experiment-container"><div class="cue-circle ${colorClass}"></div></div>`;
    },
    choices: "NO_KEYS",
    trial_duration: CUE_DURATION
  });

  const expectedKey = responseKeyMap[trialProfile.item.name][trialProfile.language];
  
  const practiceTarget = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      return `
        <div class="experiment-container">
          <div style="font-size: 16px; color: #f39c12; margin-bottom:10px; font-weight:bold;">PRACTICE MODE</div>
          <img src="${trialProfile.item.src}" class="target-pic" />
        </div>
      `;
    },
    choices: "ALL_KEYS",
    response_ends_trial: true,
    on_finish: function(data) {
      data.is_correct = (data.response === expectedKey);
    }
  };

  const practiceFeedback = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const lastTrialData = jsPsych.data.get().last(1).values()[0];
      if (lastTrialData.is_correct) {
        return `
          <div class="experiment-container">
            <h2 style="color: #2b9348;">✓ Correct!</h2>
          </div>
        `;
      } else {
        return `
          <div class="experiment-container">
            <h2 style="color: #D90429;">✗ Incorrect</h2>
            <p style="font-size: 18px;">You were cued for <strong>${trialProfile.language === 'L1' ? 'English (L1)' : 'Spanish (L2)'}</strong>.</p>
            <p style="font-weight: bold; color: #555;">Press the correct key [ ${expectedKey.toUpperCase()} ] to continue.</p>
          </div>
        `;
      }
    },
    choices: function() {
      const lastTrialData = jsPsych.data.get().last(1).values()[0];
      return lastTrialData.is_correct ? "NO_KEYS" : [expectedKey]; 
    },
    trial_duration: function() {
      const lastTrialData = jsPsych.data.get().last(1).values()[0];
      return lastTrialData.is_correct ? 1000 : null; 
    }
  };

  masterTimeline.push(practiceTarget);
  masterTimeline.push(practiceFeedback);
  
  masterTimeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="experiment-container"></div>',
    choices: "NO_KEYS",
    trial_duration: 1000
  });
});

const transitionNotice = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="max-width: 650px; text-align: center; line-height: 1.8; font-size: 18px;">
      <h3 style="color: #2b9348;">Practice Complete!</h3>
      <p>The system will no longer tell you if your responses are correct or incorrect.</p>
      <p>Remember to respond as <strong>quickly and accurately</strong> as possible.</p>
      <br />
      <p style="font-weight: bold; color: #555;">Press the SPACEBAR to begin the real experiment loop.</p>
    </div>
  `,
  choices: [' ']
};
masterTimeline.push(transitionNotice);


// --- GENERATE REAL TESTING BLOCK CONDITIONS ---
let testingConditions = [];
verbalStimuli.forEach(item => {
  activeLanguages.forEach(lang => {
    testingConditions.push({ item: item, language: lang });
  });
});

testingConditions = jsPsych.randomization.shuffle(testingConditions);
totalTestTrialsCount = testingConditions.length;

// Run Experimental Sequence Loops
testingConditions.forEach((trialProfile, index) => {
  
  // FIXED/UPDATED: Separate screen break injected cleanly before every 5th image 
  // (Appears before trial 5, 10, 15, etc.)
  if (index > 0 && index % 5 === 0) {
    const standaloneReminderScreen = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div style="max-width: 600px; text-align: center; font-family: sans-serif; line-height: 1.8;">
          <h3 style="color: #0077B6;">Quick Reminder Break</h3>
          <p style="font-size: 20px; margin: 30px 0;">
            <strong style="color: #D90429;">RED CIRCLE</strong> = English (L1)<br>
            <strong style="color: #0077B6;">BLUE CIRCLE</strong> = Spanish (L2)
          </p>
          <p style="color: #777; font-weight: bold; margin-top: 40px;">Press the SPACEBAR to resume the experiment.</p>
        </div>
      `,
      choices: [' ']
    };
    masterTimeline.push(standaloneReminderScreen);
  }

  const fixationDot = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="experiment-container"><div style="font-size: 50px; color: #bbb;">+</div></div>',
    choices: "NO_KEYS",
    trial_duration: 500
  };
  masterTimeline.push(fixationDot);

  const circleCueTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const colorClass = (trialProfile.language === 'L1') ? 'cue-red' : 'cue-blue';
      return `<div class="experiment-container"><div class="cue-circle ${colorClass}"></div></div>`;
    },
    choices: "NO_KEYS",
    trial_duration: CUE_DURATION
  };
  masterTimeline.push(circleCueTrial);

  const targetPictureTrial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      return `
        <div class="experiment-container">
          <img src="${trialProfile.item.src}" class="target-pic" />
        </div>
      `;
    },
    choices: "ALL_KEYS",
    response_ends_trial: true, 
    on_finish: function(data) {
      let currentSwitchType = "neutral";
      if (historicLanguage !== null) {
        currentSwitchType = (historicLanguage === trialProfile.language) ? "repeat" : "switch";
      }
      
      const expectedKey = responseKeyMap[trialProfile.item.name][trialProfile.language];
      const actualKeyPressed = data.response;
      const isCorrect = (actualKeyPressed === expectedKey) ? 1 : 0;
      
      historicLanguage = trialProfile.language;

      data.trial_index_within_block = index + 1;
      data.stimulus_item_name = trialProfile.item.name;
      data.target_language = trialProfile.language;
      data.switch_condition = currentSwitchType;
      
            data.expected_response_key = expectedKey;
      data.accuracy = isCorrect;

      completedTestTrials++;
      jsPsych.setProgressBar(completedTestTrials / totalTestTrialsCount);
    } // Cleanly closes the on_finish function block
  }; // FIXED: Removed the extra curly brace here to close targetPictureTrial perfectly
  masterTimeline.push(targetPictureTrial);

  const interTrialInterval = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '',
    choices: "NO_KEYS",
    trial_duration: 1000
  };
  masterTimeline.push(interTrialInterval);
}); // Cleanly closes the testingConditions loop block

// Post-Experimental Background Metadata Questionnaire Panels
const questionnaireLanguages = {
  type: jsPsychSurveyText,
  questions: [
    {
      prompt: "What is your <strong>L1 (first/native language)</strong>?",
      name: 'l1_language',
      required: true,
      rows: 1,
      columns: 40,
      placeholder: 'e.g., English'
    },
    {
      prompt: "What is your <strong>L2 (second language)</strong>?",
      name: 'l2_language',
      required: true,
      rows: 1,
      columns: 40,
      placeholder: 'e.g., Spanish'
    }
  ],
  data: { phase_id: 'questionnaire_languages' }
};
masterTimeline.push(questionnaireLanguages);
 
const questionnaireDuration = {
  type: jsPsychSurveyText,
  questions: [{
    prompt: "How long have you been speaking your second language? (e.g., '5 years')",
    name: 'l2_duration_years',
    required: true,
    rows: 2,
    columns: 40
  }],
  data: { phase_id: 'questionnaire_duration' }
};
masterTimeline.push(questionnaireDuration);

const questionnaireProficiency = {
  type: jsPsychSurveyMultiChoice,
  questions: [{
    prompt: "How would you rank your overall proficiency in your second language?",
    options: ['Beginner', 'Intermediate', 'Advanced', 'Native / Bilingual Fluency'],
    name: 'l2_proficiency_ranking',
    required: true,
    horizontal: false
  }],
  data: { phase_id: 'questionnaire_proficiency' },
  on_finish: function() {
    jsPsych.setProgressBar(1.0);
  }
};
masterTimeline.push(questionnaireProficiency);

const thankYouCompletionPage = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="max-width: 600px; margin: 0 auto; text-align: center; line-height: 1.8; font-family: sans-serif;">
      <h2 style="color: #2b9348; font-size: 32px; margin-bottom: 20px;">✓ Study Completed!</h2>
      <p style="font-size: 18px; color: #333;">Thank you very much for your time and participation in this research study.</p>
      <p style="font-size: 16px; color: #666; margin-top: 20px;">Your responses have been securely uploaded to our database engine.</p>
  `,
  // Setting choices to NO_KEYS keeps the participant on this screen permanently,
  // preventing them from accidentally hitting a key and triggering an empty loop.
  choices: "NO_KEYS",
  trial_duration: 1000
};
masterTimeline.push(thankYouCompletionPage);

jsPsych.run(masterTimeline);
