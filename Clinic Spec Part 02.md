The Clinic Wait Time Project, Part 2

You’re picking up exactly where the last lesson left off. Pull out your problem brief, your delegation plan, and your acceptance tests.
Step 1: Write the product requirement

One paragraph. Take the user need from your problem brief and scope it into something measurable. Every adjective should be a decision you can defend. If you write “fast,” write how fast. If you write “simple,” describe what simple means for a patient checking from a phone in a parking lot.
Step 2: Write the technical spec

Half a page. Describe what gets built and how it’s structured. Name the pieces. Name how they talk to each other. Use AI in augmentation mode here: share your product requirement, ask it to propose a technical approach, then push back on anything that doesn’t fit your constraints.
Step 3: Tighten your tests

Revisit your acceptance tests from the previous lesson. Rewrite them so each one is something code could pass or fail. Add at least two edge cases: what happens when the clinic is closed, when there’s no data, when the wait time is zero.
Step 4: Write your AI prompts and build

Write the instructions that turn your spec into working code. Include your constraints, your stack choices, and your tests. Build the first version.
Step 5: Demo it

Find a partner. They play a clinic patient — they’ve got a sick kid and ten minutes. Hand them your build and watch them use it. Don’t explain anything. Don’t help.

Did the tests pass? Is the patient satisfied? If those answers don’t match, which link in the chain would you go back to?