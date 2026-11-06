# CPIT-405 Web Applications

Course site: HTML, CSS and JavaScript. Static files only, no build step.

## Structure

```
index.html              Main page (all courses)
assets/home.css         Styles for the main page
javascript/
  index.html            JavaScript course home (6 parts)
  part1.html … part6.html   Animated explainers
  practice.html         Practice lab (a tab per part)
  css/course.css        Styles: course home
  css/motion.css        Styles: explainer pages
  css/practice.css      Styles: practice lab
  js/motion.js          Explainer player (timeline, narration sync, subtitles)
  js/practice.js        Practice lab logic and all exercises
  js/subtitles/partN.js Subtitles per part ([Arabic, English] per line)
  audio/pN/sceneNN.mp3  Narration per scene
html/  css/             Future courses (add a folder per course)
vercel.json             Redirects old links to /javascript/
```

## Common edits

- Change subtitle text: `javascript/js/subtitles/partN.js`
- Replace a narration file: `javascript/audio/pN/sceneNN.mp3` (keep the name; if its length changes, the scene timing in `partN.html` needs updating)
- Change exercises: `javascript/js/practice.js`
- Change colors or fonts: the `:root` block at the top of each CSS file

Developed by: Fatmah Bamashmoos
