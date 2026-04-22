const text = [
    { word: "Recolecta", class: "word-data" },
    { word: " datos", class: "word-data" },
    { word: " y", class: "" },
    { word: " actúa", class: "word-action" },
    { word: " para", class: "" },
    { word: " la", class: "" },
    { word: " eficiencia", class: "word-efficiency" }
  ];
  
  const container = document.getElementById("typed-text");
  
  let wordIndex = 0;
  let charIndex = 0;
  
  function type() {
    if (wordIndex < text.length) {
      let currentWord = text[wordIndex].word;
      let currentClass = text[wordIndex].class;
  
      if (charIndex < currentWord.length) {
        let span = document.createElement("span");
        span.className = currentClass;
        span.textContent = currentWord.charAt(charIndex);
        container.appendChild(span);
  
        charIndex++;
        setTimeout(type, 40);
      } else {
        wordIndex++;
        charIndex = 0;
        setTimeout(type, 120);
      }
    }
  }
  
  type();
  