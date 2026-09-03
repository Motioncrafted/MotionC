function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function seededRandom(seedText) {
  let state = hash(seedText) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function makeTag(proof, className = "") {
  const tag = document.createElement("span");
  const lightPaintClass = String(proof.color).toLowerCase() === "#f4f1e8" ? "is-light-paint" : "";
  tag.className = `wall-tag revealed ${className} ${lightPaintClass}`.trim();
  tag.dataset.proofId = proof.id;
  tag.style.setProperty("--tag-color", proof.color);
  tag.style.setProperty("--tag-left", `${proof.left}%`);
  tag.style.setProperty("--tag-top", `${proof.top}%`);
  tag.style.setProperty("--tag-angle", `${proof.angle}deg`);
  tag.style.setProperty("--tag-font", proof.font);
  tag.style.setProperty("--tag-size", proof.size);
  tag.style.setProperty("--tag-width", proof.width);
  tag.style.setProperty("--tag-shift-x", "0px");
  tag.style.setProperty("--tag-shift-y", "0px");
  return tag;
}

function renderBrush(layer, proof) {
  const tag = makeTag(proof, "mixed-brush");
  tag.textContent = proof.text;
  layer.append(tag);
}

function renderFreshPaint(layer, proof) {
  const random = seededRandom(proof.id);
  const tag = makeTag(proof, "fresh-paint");
  tag.setAttribute("aria-label", proof.text);
  const paintContent = document.createElement("span");
  paintContent.className = "paint-content";
  const overspray = document.createElement("span");
  overspray.className = "paint-overspray";
  overspray.setAttribute("aria-hidden", "true");
  overspray.textContent = proof.text;
  const letters = document.createElement("span");
  letters.className = "paint-letters";
  letters.setAttribute("aria-hidden", "true");
  proof.text.split(/(\s+)/).forEach(part => {
    if (/^\s+$/.test(part)) {
      const space = document.createElement("span");
      space.className = "paint-space";
      space.textContent = " ";
      letters.append(space);
      return;
    }
    const word = document.createElement("span");
    word.className = "paint-word";
    Array.from(part).forEach(character => {
      const letter = document.createElement("span");
      letter.className = "paint-letter";
      letter.textContent = character;
      letter.dataset.character = character;
      if (random() < .34) {
        letter.classList.add("aerosol-edge");
        letter.style.setProperty("--aerosol-shift-x", `${(-.025 + random() * .05).toFixed(3)}em`);
        letter.style.setProperty("--aerosol-shift-y", `${(-.02 + random() * .04).toFixed(3)}em`);
        letter.style.setProperty("--aerosol-strength", `${(.24 + random() * .1).toFixed(2)}`);
      }
      letter.style.setProperty("--letter-turn", `${(-1 + random() * 2).toFixed(2)}deg`);
      letter.style.setProperty("--letter-rise", `${(-.035 + random() * .07).toFixed(3)}em`);
      letter.style.setProperty("--letter-space", `${(-.015 + random() * .026).toFixed(3)}em`);
      letter.style.setProperty("--paint-density", `${(.89 + random() * .11).toFixed(2)}`);
      word.append(letter);
    });
    letters.append(word);
  });
  const effects = document.createElement("span");
  effects.className = "paint-effects";
  effects.setAttribute("aria-hidden", "true");
  for (let index = 0; index < proof.dripCount; index += 1) {
    const drip = document.createElement("i");
    drip.className = "paint-drip";
    drip.style.setProperty("--effect-left", `${(20 + random() * 62).toFixed(1)}%`);
    drip.style.setProperty("--effect-top", `${(76 + random() * 8).toFixed(1)}%`);
    drip.style.setProperty("--drip-length", `${(.6 + random() * .34).toFixed(2)}em`);
    drip.style.setProperty("--drip-width", `${(.064 + random() * .03).toFixed(3)}em`);
    effects.append(drip);
  }
  for (let index = 0; index < 3; index += 1) {
    const fleck = document.createElement("i");
    fleck.className = "paint-fleck";
    fleck.style.setProperty("--effect-left", `${(-2 + random() * 104).toFixed(1)}%`);
    fleck.style.setProperty("--effect-top", `${(7 + random() * 84).toFixed(1)}%`);
    fleck.style.setProperty("--fleck-size", `${(.035 + random() * .052).toFixed(3)}em`);
    fleck.style.setProperty("--fleck-stretch", `${(.7 + random() * 1.15).toFixed(2)}`);
    effects.append(fleck);
  }
  paintContent.append(overspray, letters, effects);
  tag.append(paintContent);
  layer.append(tag);
}

function renderWild(layer, proof) {
  const random = seededRandom(proof.id);
  const tag = makeTag(proof, "wild-tag");
  tag.setAttribute("aria-label", proof.text);
  tag.style.setProperty("--wild-swipe-angle", `${(-2 + random() * 4).toFixed(2)}deg`);
  tag.style.setProperty("--wild-swipe-width", `${(64 + random() * 24).toFixed(1)}%`);
  proof.text.split(" ").forEach((wordText, wordIndex, words) => {
    const word = document.createElement("span");
    word.className = "wild-word";
    Array.from(wordText).forEach((character, characterIndex) => {
      const letter = document.createElement("span");
      letter.className = "wild-letter";
      if (random() > .7) letter.classList.add("wild-edge-hit");
      letter.textContent = character;
      letter.dataset.echo = character;
      letter.style.setProperty("--wild-rise", `${(-.1 + random() * .2).toFixed(3)}em`);
      letter.style.setProperty("--wild-turn", `${(-4.2 + random() * 8.4).toFixed(2)}deg`);
      letter.style.setProperty("--wild-skew", `${(-6 + random() * 12).toFixed(2)}deg`);
      letter.style.setProperty("--wild-gap", `${(-.045 + random() * .065).toFixed(3)}em`);
      letter.style.setProperty("--wild-edge-x", `${(-.055 + random() * .11).toFixed(3)}em`);
      letter.style.setProperty("--wild-edge-y", `${(-.035 + random() * .07).toFixed(3)}em`);
      letter.style.setProperty("--wild-edge-opacity", `${(.2 + random() * .16).toFixed(2)}`);
      word.append(letter);
      if (characterIndex === wordText.length - 1 && random() > .76) {
        const burst = document.createElement("i");
        burst.className = "wild-burst";
        burst.style.setProperty("--wild-burst-x", `${(75 + random() * 35).toFixed(1)}%`);
        burst.style.setProperty("--wild-burst-y", `${(-15 + random() * 90).toFixed(1)}%`);
        burst.style.setProperty("--wild-burst-turn", `${(-24 + random() * 48).toFixed(1)}deg`);
        word.append(burst);
      }
    });
    tag.append(word);
    if (wordIndex < words.length - 1) tag.append(document.createTextNode(" "));
  });
  if (proof.swipe) {
    const swipe = document.createElement("i");
    swipe.className = "wild-swipe";
    tag.append(swipe);
  }
  layer.append(tag);
}

function renderMarker(layer, proof) {
  const random = seededRandom(proof.id);
  const tag = makeTag(proof, "marker-tag");
  tag.setAttribute("aria-label", proof.text);
  tag.style.setProperty("--marker-break-shift", `${(random() * 9).toFixed(2)}px`);
  proof.text.split(" ").forEach((wordText, wordIndex, words) => {
    const word = document.createElement("span");
    word.className = "marker-word";
    Array.from(wordText).forEach((character, characterIndex) => {
      const letter = document.createElement("span");
      letter.className = "marker-letter";
      letter.dataset.glyph = character;
      letter.textContent = character;
      letter.style.setProperty("--marker-rise", `${(-.055 + random() * .11).toFixed(3)}em`);
      letter.style.setProperty("--marker-turn", `${(-2.1 + random() * 4.2).toFixed(2)}deg`);
      letter.style.setProperty("--marker-skew", `${(-2.4 + random() * 4.8).toFixed(2)}deg`);
      letter.style.setProperty("--marker-scale-x", `${(.94 + random() * .1).toFixed(3)}`);
      letter.style.setProperty("--marker-scale-y", `${(.96 + random() * .08).toFixed(3)}`);
      letter.style.setProperty("--marker-gap", `${(-.035 + random() * .055).toFixed(3)}em`);
      letter.style.setProperty("--marker-weight", `${Math.round(760 + random() * 140)}`);
      letter.style.setProperty("--marker-opacity", `${(.9 + random() * .09).toFixed(2)}`);
      letter.style.setProperty("--marker-local-break", `${(random() * 8).toFixed(2)}px`);
      if (random() > .76) letter.classList.add("marker-overlap");
      if (characterIndex === 0 && random() > .58) letter.classList.add("marker-touch-in");
      if (characterIndex === wordText.length - 1 && random() > .64) letter.classList.add("marker-lift-off");
      word.append(letter);
    });
    tag.append(word);
    if (wordIndex < words.length - 1) tag.append(document.createTextNode(" "));
  });
  layer.append(tag);
}

function renderChalk(layer, proof) {
  const random = seededRandom(proof.id);
  const tag = makeTag(proof, "chalk-tag");
  tag.setAttribute("aria-label", proof.text);
  proof.text.split(" ").forEach((wordText, wordIndex, words) => {
    const word = document.createElement("span");
    word.className = "chalk-word";
    Array.from(wordText).forEach((character, characterIndex) => {
      const letter = document.createElement("span");
      letter.className = "chalk-letter";
      letter.dataset.glyph = character;
      letter.textContent = character;
      letter.style.setProperty("--chalk-rise", `${(-.06 + random() * .12).toFixed(3)}em`);
      letter.style.setProperty("--chalk-turn", `${(-2.4 + random() * 4.8).toFixed(2)}deg`);
      letter.style.setProperty("--chalk-scale", `${(.95 + random() * .09).toFixed(3)}`);
      letter.style.setProperty("--chalk-gap", `${(-.035 + random() * .06).toFixed(3)}em`);
      letter.style.setProperty("--chalk-opacity", `${(.78 + random() * .18).toFixed(2)}`);
      letter.style.setProperty("--chalk-break", `${(random() * 6).toFixed(2)}px`);
      letter.style.setProperty("--chalk-grain-x", `${(random() * 9).toFixed(2)}px`);
      letter.style.setProperty("--chalk-dust-x", `${(-.018 + random() * .036).toFixed(3)}em`);
      letter.style.setProperty("--chalk-dust-y", `${(-.012 + random() * .024).toFixed(3)}em`);
      letter.style.setProperty("--chalk-deposit-top", `${(14 + random() * 58).toFixed(1)}%`);
      if (random() > .69) letter.classList.add("chalk-deposit");
      if (random() > .72) letter.classList.add("chalk-dusty");
      if ((characterIndex === 0 || characterIndex === wordText.length - 1) && random() > .62) letter.classList.add("chalk-contact");
      word.append(letter);
    });
    tag.append(word);
    if (wordIndex < words.length - 1) tag.append(document.createTextNode(" "));
  });
  layer.append(tag);
}

function intersects(box, occupied, padding = 7) {
  return occupied.some(other =>
    box.right + padding > other.left && box.left - padding < other.right &&
    box.bottom + padding > other.top && box.top - padding < other.bottom
  );
}

function sizingProfile(entry) {
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(entry.text)]
    .map(segment => segment.segment);
  const visibleGraphemes = graphemes.filter(grapheme => !/^\s+$/u.test(grapheme));
  const emojiCount = visibleGraphemes.filter(grapheme => /\p{Extended_Pictographic}/u.test(grapheme)).length;
  const visualLength = graphemes.length + emojiCount * .75;
  const emojiOnly = emojiCount > 0 && emojiCount === visibleGraphemes.length;
  const emojiDominant = emojiCount > 0 && emojiCount / visibleGraphemes.length >= .5;
  const words = entry.text.trim().split(/\s+/).length;
  const treatmentAdjustment = { wild: -1.2, marker: -.6, chalk: -.5, "fresh-paint": 0, brush: 0 }[entry.treatment];
  const prominenceVariation = ((hash(`${entry.id}-prominence`) % 10000) / 9999 - .5) * 4.4;
  const emojiProminenceCap = emojiOnly ? 28 : emojiDominant ? 30 : 36;
  return {
    minimum: 17,
    maximum: Math.max(17, Math.min(emojiProminenceCap,
      34 - Math.pow(Math.max(0, visualLength - 4), .82) * .55 -
      Math.max(0, words - 2) * .35 + treatmentAdjustment + prominenceVariation
    )),
    preferredWidth: Math.max(15, Math.min(32,
      13 + Math.sqrt(visualLength) * 2.2 + Math.max(0, words - 4) * .3
    )),
    graphemeCount: graphemes.length,
    emojiCount,
    visualLength
  };
}

function positionAutomatically(layer, entry, renderer, occupied, exclusions, random, region) {
  const profile = sizingProfile(entry);
  const initial = {
    ...entry,
    left: 3,
    top: 12,
    width: `${profile.preferredWidth}%`,
    size: `${profile.maximum}px`
  };
  renderer(layer, initial);
  const tag = layer.lastElementChild;
  let placement = null;

  for (let fontSize = profile.maximum; fontSize >= profile.minimum && !placement; fontSize -= 1) {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const width = region.width * (.82 + random() * .12);
      const left = region.left + random() * Math.max(.1, region.width - width);
      const top = region.top + random() * Math.max(.1, region.height * .06);
      tag.style.setProperty("--tag-size", `${fontSize.toFixed(2)}px`);
      tag.style.setProperty("--tag-width", `${width.toFixed(2)}%`);
      tag.style.setProperty("--tag-left", `${left.toFixed(2)}%`);
      tag.style.setProperty("--tag-top", `${top.toFixed(2)}%`);
      const box = tag.getBoundingClientRect();
      const layerBox = layer.getBoundingClientRect();
      const regionBox = {
        left: layerBox.left + layerBox.width * region.left / 100,
        right: layerBox.left + layerBox.width * (region.left + region.width) / 100,
        top: layerBox.top + layerBox.height * region.top / 100,
        bottom: layerBox.top + layerBox.height * (region.top + region.height) / 100
      };
      const inside = box.left >= regionBox.left - 12 && box.right <= regionBox.right + 12 &&
        box.top >= regionBox.top - 10 && box.bottom <= regionBox.bottom + 10;
      if (inside && !intersects(box, occupied) && !intersects(box, exclusions, 5)) {
        placement = { box, fontSize, width, left, top };
        break;
      }
    }
  }

  if (!placement) {
    tag.remove();
    throw new Error(`Automatic sizing could not place: ${entry.text}`);
  }

  tag.dataset.autoFont = placement.fontSize.toFixed(2);
  tag.dataset.autoWidth = placement.width.toFixed(2);
  tag.dataset.messageLength = String(profile.graphemeCount);
  tag.dataset.wordCount = String(entry.text.trim().split(/\s+/).length);
  tag.dataset.emojiCount = String(profile.emojiCount);
  tag.dataset.visualLength = profile.visualLength.toFixed(2);
  entry.element = tag;
  entry.left = placement.left;
  entry.top = placement.top;
  entry.width = `${placement.width.toFixed(2)}%`;
  entry.size = `${placement.fontSize.toFixed(2)}px`;
  occupied.push(placement.box);
}

export const STYLE_FONTS = {
  brush: "'Brush Script MT', 'Segoe Script', 'Segoe Print', cursive",
  "fresh-paint": "'Arial Rounded MT Bold', 'Trebuchet MS', Arial, sans-serif",
  wild: "'Arial Black', Impact, sans-serif",
  marker: "'Segoe Print', 'Comic Sans MS', cursive",
  chalk: "'Comic Sans MS', 'Segoe Print', cursive"
};

export function normalizeRenderStyle(value) {
  return Object.hasOwn(STYLE_FONTS, value) ? value : "brush";
}

function rendererFor(style) {
  return { brush: renderBrush, "fresh-paint": renderFreshPaint, wild: renderWild, marker: renderMarker, chalk: renderChalk }[style];
}

function freshDripCount(entry) {
  const random = seededRandom(`${entry.id}-drip`);
  const roll = random();
  if (entry.text.length <= 10) return roll < .55 ? 0 : 1;
  if (entry.text.length <= 18) return roll < .42 ? 0 : 1;
  if (entry.text.length <= 28) return roll < .32 ? 0 : roll < .94 ? 1 : 2;
  return roll < .25 ? 0 : roll < .88 ? 1 : 2;
}

export function renderAutoWall(layer, sourceEntries) {
  layer.replaceChildren();
  document.body.classList.add("auto-wall-layout");
  const entries = sourceEntries.slice(-15).map(source => {
    const treatment = normalizeRenderStyle(source.renderStyle || source.render_style);
    return {
      ...source,
      treatment,
      renderer: rendererFor(treatment),
      font: STYLE_FONTS[treatment],
      angle: Number.isFinite(Number(source.rotation)) ? Number(source.rotation) : -4 + (hash(source.id) % 9),
      dripCount: treatment === "fresh-paint" ? freshDripCount(source) : 0,
      swipe: treatment === "wild" && hash(`${source.id}-swipe`) % 100 < 58
    };
  });
  const random = seededRandom(entries.map(entry => entry.id).join("|") || "empty-wall");
  const occupied = [];
  const exclusions = [];
  const regions = [
    { left:3, top:11.5, width:25, height:12.5 },
    { left:31, top:13, width:19, height:10.5 },
    { left:54, top:11, width:24, height:13 },
    { left:5, top:25.5, width:18, height:10 },
    { left:27, top:25, width:26, height:13 },
    { left:58, top:26.5, width:20, height:10.5 },
    { left:3, top:39.5, width:27, height:12 },
    { left:35, top:39, width:18, height:10 },
    { left:58, top:39.5, width:20, height:12 },
    { left:3, top:53, width:11.5, height:7 },
    { left:32, top:52.5, width:16, height:8 },
    { left:65, top:53, width:13, height:7.5 },
    { left:18, top:63, width:11, height:6 },
    { left:35, top:62, width:12, height:6 },
    { left:54, top:63, width:11, height:6 }
  ];
  const orderedEntries = entries.slice().sort((a, b) => sizingProfile(b).visualLength - sizingProfile(a).visualLength);
  const orderedRegions = regions.slice().sort((a, b) => b.width * b.height - a.width * a.height);
  orderedEntries.forEach((entry, index) => {
    const region = orderedRegions[index];
    try {
      positionAutomatically(layer, entry, entry.renderer, occupied, exclusions, random, region);
    } catch {
      const fallback = {
        ...entry,
        left: region.left + region.width * .08,
        top: region.top + region.height * .08,
        width: `${(region.width * .76).toFixed(2)}%`,
        size: "17px"
      };
      entry.renderer(layer, fallback);
      entry.element = layer.lastElementChild;
      entry.left = fallback.left;
      entry.top = fallback.top;
      entry.width = fallback.width;
      entry.size = fallback.size;
      occupied.push(entry.element.getBoundingClientRect());
    }
  });
  return entries;
}
