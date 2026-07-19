(() => {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!finePointer.matches || reducedMotion.matches) {
    return;
  }

  const radius = 110;
  const characters = [];
  const segmenter = "Segmenter" in Intl
    ? new Intl.Segmenter("ja", { granularity: "grapheme" })
    : null;

  const splitText = (text) => {
    if (segmenter) {
      return Array.from(segmenter.segment(text), ({ segment }) => segment);
    }

    return Array.from(text);
  };

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        if (node.parentElement.closest(
          "script, style, noscript, [data-elusive-ignore]"
        )) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();

    splitText(node.nodeValue).forEach((character) => {
      if (/\s/u.test(character)) {
        fragment.append(document.createTextNode(character));
        return;
      }

      const span = document.createElement("span");
      span.className = "elusive-character";
      span.textContent = character;
      span.dataset.seed = String(characters.length);
      fragment.append(span);
      characters.push(span);
    });

    node.replaceWith(fragment);
  });

  document.body.classList.add("elusive-text-enabled");

  let pointerX = -1000;
  let pointerY = -1000;
  let frame = 0;

  const updateCharacters = () => {
    frame = 0;

    characters.forEach((character) => {
      const rect = character.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = centerX - pointerX;
      const deltaY = centerY - pointerY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance >= radius) {
        character.style.removeProperty("--escape-x");
        character.style.removeProperty("--escape-y");
        character.style.removeProperty("--escape-rotation");
        character.style.removeProperty("--escape-blur");
        character.style.removeProperty("--escape-opacity");
        return;
      }

      const proximity = 1 - distance / radius;
      const seed = Number(character.dataset.seed);
      const angle = distance > 0.5
        ? Math.atan2(deltaY, deltaX)
        : seed * 2.399963;
      const scatter = Math.sin(seed * 12.9898) * proximity;
      const escapeDistance = 8 + proximity * 58;

      character.style.setProperty(
        "--escape-x",
        `${Math.cos(angle) * escapeDistance + scatter * 12}px`
      );
      character.style.setProperty(
        "--escape-y",
        `${Math.sin(angle) * escapeDistance + scatter * 8}px`
      );
      character.style.setProperty(
        "--escape-rotation",
        `${scatter * 28}deg`
      );
      character.style.setProperty(
        "--escape-blur",
        `${proximity * 5}px`
      );
      character.style.setProperty(
        "--escape-opacity",
        String(Math.max(0.06, 1 - proximity * 1.15))
      );
    });
  };

  const scheduleUpdate = () => {
    if (!frame) {
      frame = window.requestAnimationFrame(updateCharacters);
    }
  };

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    scheduleUpdate();
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    pointerX = -1000;
    pointerY = -1000;
    scheduleUpdate();
  });

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
})();
