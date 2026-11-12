(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ingredients = {
    flour: ["🌾", "Flour"], egg: ["🥚", "Egg"], milk: ["🥛", "Milk"],
    strawberry: ["🍓", "Strawberry"], dough: ["🫓", "Dough"],
    tomato: ["🍅", "Tomato"], cheese: ["🧀", "Cheese"], basil: ["🌿", "Basil"],
    broth: ["💧", "Broth"], carrot: ["🥕", "Carrot"], mushroom: ["🍄", "Mushroom"],
    corn: ["🌽", "Corn"], potato: ["🥔", "Potato"], pumpkin: ["🎃", "Pumpkin"],
    spinach: ["🥬", "Spinach"], bun: ["🍞", "Burger Bun"],
    patty: ["🥩", "Burger Patty"], lettuce: ["🥬", "Lettuce"],
    pickle: ["🥒", "Pickle"], veggiepatty: ["🫘", "Veggie Patty"],
    cucumber: ["🥒", "Cucumber"], croutons: ["🥖", "Croutons"],
    dressing: ["🫙", "Dressing"], icecream: ["🍦", "Ice Cream"],
    chocolate: ["🍫", "Chocolate"], sprinkles: ["🍬", "Sprinkles"],
    cherry: ["🍒", "Cherry"], banana: ["🍌", "Banana"],
    apple: ["🍎", "Apple"], grapes: ["🍇", "Grapes"],
    hotdogbun: ["🥖", "Hot Dog Bun"], sausage: ["🌭", "Sausage"],
    ketchup: ["", "Ketchup"], mustard: ["🟡", "Mustard"],
    onion: ["🧅", "Onion"], tortilla: ["🫓", "Tortilla"],
    beef: ["🥩", "Beef"], beans: ["🫘", "Beans"],
    frosting: ["🧁", "Frosting"], oil: ["🫒", "Oil"],
    salt: ["🧂", "Salt"], paprika: ["🌶️", "Paprika"]
  };

  // Recipes are [name, finished-food emoji, ingredient IDs]. Each category has
  // a shuffled deck, so choosing the same food again produces a new recipe.
  const categories = {
    soup: { emoji: "🍲", label: "Soup", verb: "Stir", verbEmoji: "🥄", cold: false,
      pool: "broth carrot corn tomato basil mushroom potato pumpkin milk spinach onion cheese",
      recipes: [
        ["Carrot & Corn Soup", "🍲", "broth carrot corn"],
        ["Tomato Basil Soup", "🥣", "broth tomato basil"],
        ["Mushroom Potato Soup", "🍲", "broth mushroom potato"],
        ["Creamy Pumpkin Soup", "🥣", "pumpkin broth milk"]
      ] },
    pizza: { emoji: "🍕", label: "Pizza", verb: "Bake", verbEmoji: "🔥", cold: false,
      pool: "dough tomato cheese basil mushroom corn spinach onion sausage ketchup",
      recipes: [
        ["Cheese Pizza", "🍕", "dough tomato cheese"],
        ["Mushroom Pizza", "🍕", "dough tomato cheese mushroom"],
        ["Garden Pizza", "🍕", "dough tomato basil spinach"]
      ] },
    pancakes: { emoji: "🥞", label: "Pancakes", verb: "Flip", verbEmoji: "🥞", cold: false,
      pool: "flour egg milk strawberry banana chocolate cheese pumpkin corn frosting",
      recipes: [
        ["Strawberry Pancakes", "🥞", "flour egg milk strawberry"],
        ["Banana Pancakes", "🥞", "flour egg milk banana"],
        ["Chocolate Pancakes", "🥞", "flour egg milk chocolate"]
      ] },
    burger: { emoji: "🍔", label: "Burger", verb: "Grill", verbEmoji: "🔥", cold: false,
      pool: "bun patty veggiepatty cheese lettuce tomato pickle onion ketchup mustard sausage",
      recipes: [
        ["Cheeseburger", "🍔", "bun patty cheese tomato"],
        ["Classic Burger", "🍔", "bun patty lettuce pickle"],
        ["Veggie Burger", "🍔", "bun veggiepatty lettuce tomato"]
      ] },
    salad: { emoji: "🥗", label: "Salad", verb: "Toss", verbEmoji: "🥗", cold: true,
      pool: "lettuce tomato cucumber carrot croutons cheese dressing strawberry banana apple grapes corn",
      recipes: [
        ["Garden Salad", "🥗", "lettuce tomato cucumber carrot"],
        ["Caesar Salad", "🥗", "lettuce croutons cheese dressing"],
        ["Fruit Salad", "🍓", "strawberry banana apple grapes"]
      ] },
    icecream: { emoji: "🍨", label: "Ice Cream", verb: "Scoop", verbEmoji: "🍦", cold: true,
      pool: "icecream strawberry cherry sprinkles chocolate banana grapes apple frosting milk",
      recipes: [
        ["Strawberry Sundae", "🍨", "icecream strawberry cherry sprinkles"],
        ["Chocolate Sundae", "🍨", "icecream chocolate sprinkles cherry"],
        ["Banana Split", "🍌", "icecream banana chocolate strawberry"]
      ] },
    hotdog: { emoji: "🌭", label: "Hot Dog", verb: "Grill", verbEmoji: "🔥", cold: false,
      pool: "hotdogbun sausage ketchup mustard onion cheese pickle tomato lettuce",
      recipes: [
        ["Classic Hot Dog", "🌭", "hotdogbun sausage ketchup mustard"],
        ["Cheesy Hot Dog", "🌭", "hotdogbun sausage cheese ketchup"],
        ["Onion Hot Dog", "🌭", "hotdogbun sausage onion mustard"]
      ] },
    taco: { emoji: "🌮", label: "Tacos", verb: "Fill", verbEmoji: "🌮", cold: true,
      pool: "tortilla beef beans cheese lettuce tomato corn onion paprika carrot",
      recipes: [
        ["Beef Taco", "🌮", "tortilla beef cheese lettuce"],
        ["Veggie Taco", "🌮", "tortilla beans corn tomato"]
      ] },
    cupcake: { emoji: "🧁", label: "Cupcake", verb: "Decorate", verbEmoji: "🧁", cold: true,
      pool: "flour egg milk frosting chocolate strawberry banana sprinkles cherry",
      recipes: [
        ["Vanilla Cupcake", "🧁", "flour egg milk frosting"],
        ["Chocolate Cupcake", "🧁", "flour egg chocolate frosting"],
        ["Strawberry Cupcake", "🧁", "flour egg strawberry frosting"]
      ] },
    fries: { emoji: "🍟", label: "Fries", verb: "Shake", verbEmoji: "🍟", cold: false,
      pool: "potato oil salt ketchup cheese paprika mustard tomato",
      recipes: [
        ["Classic French Fries", "🍟", "potato oil salt ketchup"],
        ["Cheesy Fries", "🍟", "potato oil cheese salt"],
        ["Spicy Fries", "🍟", "potato oil paprika salt"]
      ] }
  };

  const customers = [
    ["🐰", "Bunny Bella"], ["🐱", "Kitty Coco"], ["🐻", "Bear Benny"],
    ["🦊", "Foxy Finn"], ["🐼", "Panda Poppy"], ["🐨", "Koala Kiki"],
    ["🐸", "Froggy Fred"], ["🐹", "Hammy Hazel"]
  ];
  const kinds = Object.keys(categories);
  const maxOrders = customers.length;
  const bestKey = "little-chef-kitchen-best";
  let best = 0;
  try { best = Number(localStorage.getItem(bestKey)) || 0; } catch (_) { /* private browsing */ }

  let decks = {};
  let lastRecipe = {};
  let categoryBag = [];
  let order = 0;
  let score = 0;
  let selected = [];
  let current = null;
  let shelf = [];
  let phase = "pick";
  let steps = 0;
  let mistakes = 0;
  let served = false;

  const ketchupBottle = '<span class="ketchup-bottle" role="img" aria-label="Red ketchup bottle"><b>K</b></span>';
  function icon(id) { return id === "ketchup" ? ketchupBottle : ingredients[id][0]; }
  function shuffle(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function nextCategory() {
    if (!categoryBag.length) categoryBag = shuffle(kinds);
    return categoryBag.pop();
  }
  function nextRecipe(kind) {
    if (!decks[kind] || !decks[kind].length) {
      const deck = shuffle(categories[kind].recipes);
      // Never repeat the last recipe when a shuffled deck runs out.
      if (deck.length > 1 && lastRecipe[kind] === deck[deck.length - 1][0]) {
        [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
      }
      decks[kind] = deck;
    }
    const recipe = decks[kind].pop();
    lastRecipe[kind] = recipe[0];
    return { kind, name: recipe[0], emoji: recipe[1], need: recipe[2].split(" ") };
  }
  function say(message) { $("status").textContent = message; }
  function correct() {
    return selected.length === current.need.length && current.need.every((id) => selected.includes(id));
  }

  function chooseFood(kind) {
    // A customer who is already cooking/being served cannot change orders.
    if (phase !== "pick") return;
    current = nextRecipe(kind);
    selected = [];
    steps = 0;
    mistakes = 0;
    served = false;
    const distractions = shuffle(categories[kind].pool.split(" ").filter((id) => !current.need.includes(id)))
      .slice(0, 12 - current.need.length);
    shelf = shuffle([...current.need, ...distractions]);
    $("food-title").textContent = `${current.emoji} ${current.name}!`;
    $("recipe").innerHTML = '<strong>Ingredients:</strong> ' + current.need
      .map((id) => `${icon(id)} ${ingredients[id][1]}`).join(" · ");
    $("customer").textContent = `${customers[order][1].toUpperCase()} IS HUNGRY`;
    $("animal").textContent = customers[order][0];
    $("round").textContent = `Customer ${order + 1} / ${maxOrders}`;
    $("score").textContent = `⭐ ${score} stars`;
    $("best").textContent = `🏆 Best: ${best}`;
    $("result-overlay").hidden = true;
    say(`${customers[order][1]} wants ${current.name}! 💕`);
    render();
  }

  function render() {
    const menu = $("menu");
    menu.replaceChildren();
    for (const kind of kinds) {
      const item = categories[kind];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-button" + (current && current.kind === kind ? " active" : "");
      button.disabled = phase !== "pick";
      button.innerHTML = `<span class="emoji">${item.emoji}</span><span class="name">${item.label}</span>`;
      button.addEventListener("click", () => chooseFood(kind));
      menu.append(button);
    }
    $("surprise").disabled = phase !== "pick";

    const ingredientGrid = $("ingredients");
    ingredientGrid.replaceChildren();
    for (const id of shelf) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ingredient";
      button.disabled = phase !== "pick";
      button.setAttribute("aria-pressed", String(selected.includes(id)));
      button.innerHTML = `<span class="em">${icon(id)}</span><span class="label">${ingredients[id][1]}</span>`;
      button.addEventListener("click", () => toggleIngredient(id));
      ingredientGrid.append(button);
    }

    $("count").textContent = `${selected.length} / ${current.need.length} ingredients`;
    const food = $("plate-food");
    food.classList.toggle("finished", phase === "ready");
    if (phase === "ready") food.textContent = current.emoji;
    else if (selected.length) food.innerHTML = selected.map((id) => `<span>${icon(id)}</span>`).join("");
    else food.innerHTML = '<span class="empty">Add ingredients!</span>';

    const category = categories[current.kind];
    $("cooking-effect").textContent = category.cold ? "✨ ❄️ ✨" : "🔥 🔥 🔥";
    $("cooking-effect").classList.toggle("on", phase === "cook");
    $("clear").disabled = phase !== "pick" || !selected.length;
    if (phase === "pick") {
      $("action").textContent = "👩‍🍳 Prepare Food!";
      $("action").disabled = !correct();
      $("tip").textContent = correct() ? "All ingredients are ready! 🎉" : "Find the ingredients on the order ticket.";
    } else if (phase === "cook") {
      $("action").textContent = `${category.verbEmoji} ${category.verb}! ${steps}/3`;
      $("action").disabled = false;
      $("tip").textContent = `Tap three times to ${category.verb.toLowerCase()} your food!`;
    } else {
      $("action").textContent = "🍽️ Serve Food!";
      $("action").disabled = false;
      $("tip").textContent = "Delicious! Serve your customer! 💕";
    }
  }

  function toggleIngredient(id) {
    if (phase !== "pick") return;
    const existing = selected.indexOf(id);
    if (existing >= 0) {
      selected.splice(existing, 1);
      say(`Removed ${ingredients[id][1]}.`);
    } else {
      if (selected.length >= 5) { say("Your plate is full! Remove something first."); return; }
      selected.push(id);
      if (!current.need.includes(id)) {
        mistakes++;
        say(`Hmm, does this recipe need ${ingredients[id][1]}? 🤔`);
      } else {
        say(["Nice choice! 👍", "Yummy! 😋", "Looking good! ✨"][Math.floor(Math.random() * 3)]);
      }
    }
    render();
    if (correct()) say("All the ingredients are ready! 🎉");
  }

  function sparkle() {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${25 + Math.random() * 50}%`;
    spark.textContent = ["⭐", "✨", "💛"][Math.floor(Math.random() * 3)];
    $("prep-area").append(spark);
    setTimeout(() => spark.remove(), 800);
  }

  function action() {
    if (served) return;
    if (phase === "pick") {
      if (!correct()) return;
      phase = "cook";
      say("Let’s make something delicious! 🪄");
      render();
    } else if (phase === "cook") {
      steps++;
      sparkle();
      $("plate").style.transform = `rotate(${steps % 2 ? 9 : -9}deg)`;
      setTimeout(() => { $("plate").style.transform = ""; }, 160);
      if (steps >= 3) { phase = "ready"; say(`Your ${current.name} is ready! 😋`); }
      render();
    } else if (phase === "ready") {
      served = true;
      const earned = mistakes ? 2 : 3;
      score += earned;
      $("score").textContent = `⭐ ${score} stars`;
      $("result-emoji").textContent = customers[order][0];
      $("result-title").textContent = "DELICIOUS! 🌟";
      $("result-text").textContent = `${customers[order][1]} loves the ${current.name}! You earned ${earned} stars!`;
      $("next").textContent = order === maxOrders - 1 ? "🏆 See My Chef Award" : "Next Customer →";
      $("result-overlay").hidden = false;
      $("next").focus();
    }
  }

  function finish() {
    if (score > best) {
      best = score;
      try { localStorage.setItem(bestKey, String(best)); } catch (_) { /* private browsing */ }
    }
    $("best").textContent = `🏆 Best: ${best}`;
    $("result-emoji").textContent = "🏆";
    $("result-title").textContent = score >= 23 ? "SUPER STAR CHEF!" : "AMAZING LITTLE CHEF!";
    $("result-text").textContent = `You served ${maxOrders} happy customers and earned ${score} out of ${maxOrders * 3} stars! Your restaurant is a big success!`;
    $("next").textContent = "🍳 Open Restaurant Again";
    $("next").onclick = reset;
  }

  function nextCustomer() {
    if (order === maxOrders - 1) { finish(); return; }
    order++;
    // Important: reset the ready-to-serve state BEFORE choosing a new recipe.
    // Otherwise one tap advances the counter but leaves the old food on screen.
    phase = "pick";
    served = false;
    chooseFood(nextCategory());
  }

  function reset() {
    order = 0; score = 0; selected = []; current = null; phase = "pick";
    decks = {}; categoryBag = shuffle(kinds); served = false;
    $("next").onclick = nextCustomer;
    chooseFood(nextCategory());
  }

  $("action").addEventListener("click", action);
  $("clear").addEventListener("click", () => {
    if (phase !== "pick") return;
    selected = [];
    say("Fresh plate! Let’s try again. 🍽️");
    render();
  });
  $("surprise").addEventListener("click", () => chooseFood(nextCategory()));
  reset();
})();
