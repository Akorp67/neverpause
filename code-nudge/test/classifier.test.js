const assert = require("assert");
const { classify } = require("../classifier.js");

const code = [
  "Build me a website for my sleepwear brand with a waitlist form and deploy it",
  "My tests are failing after I updated the login page, can you fix the repo?",
  "Rename all the files in my downloads folder so they start with the date",
  "Traceback (most recent call last):\n  File \"app.py\", line 12\nKeyError: 'user'\nwhy is this happening in my project",
  "Write a script that goes through these 300 PDFs and pulls the invoice totals into a csv",
  "Refactor the checkout code across all the components and then run the tests",
];
const chat = [
  "What is the difference between a Roth IRA and a 401k?",
  "Write an email to my landlord asking to fix the heating",
  "Summarize this article for me",
  "Give me ideas for a 5 year old's birthday party",
  "How does a transformer model work?",
  "hi",
];
let fails = 0;
for (const p of code) {
  const r = classify(p);
  if (r.verdict !== "code") { fails++; console.log("EXPECTED code:", r.verdict, r.score, JSON.stringify(p)); }
}
for (const p of chat) {
  const r = classify(p);
  if (r.verdict !== "chat") { fails++; console.log("EXPECTED chat:", r.verdict, r.score, JSON.stringify(p)); }
}
console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
