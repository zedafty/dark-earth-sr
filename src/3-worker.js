// =============================================================================
// -----------------------------------------------------------------------------
// # Constants
// -----------------------------------------------------------------------------
// =============================================================================

const Sheet = {
	"version" : 1.01,
	"name" : "Dark Earth (Simplified Rules)"
};

// =============================================================================
// -----------------------------------------------------------------------------
// # Functions
// -----------------------------------------------------------------------------
// =============================================================================

function toInt(s) { // s = string ; returns number
	return parseInt(s) || 0;
}

function clamp(n, min, max, def) { // n = number, min = number, max = number, def = default ; returns number
	if (min == null) min = -Infinity;
	if (max == null) max = Infinity;
	if (def == null) def = 0;
	return Math.min(Math.max(n, min), max) || def;
}

function crop(s, n) { // s = string, n = number of characters to remove ; returns string
	return s.substring(0, s.length - n);
}

function getLang(s) { // s = string ; returns string
	let r = getTranslationByKey(s);
	return r ? r : "";
}

// =============================================================================
// -----------------------------------------------------------------------------
// # Formulas
// -----------------------------------------------------------------------------
// =============================================================================

/**
	RegExp:
	4
	2D
	2D+4
	/^(
	\+?\d+
	|\+?\d+d
	|\+?\d+d\s*[\+\-]\s*\d+
	)$/i
*/

const Formulas = {
	"arm" : /^(\+?\d+|\+?\d+d|\+?\d+d\s*[\+\-]\s*\d+)$/i
};

function formatFormula(s, k) { // s = string, k = key ; returns string
	s = s.trim().toLowerCase();
	let r = Formulas[k];
	return r.test(s) ? s.replace("d", "D").replace(/^[0]+([1-9])+/, "$1").replace(/([^\d]+)[0]+([1-9])+/g, "$1$2").replaceAll(" ", "") : "0";
}

// =============================================================================
// -----------------------------------------------------------------------------
// # Attributes
// -----------------------------------------------------------------------------
// =============================================================================

const AbilityAttrs = ["abi-str", "abi-acr", "abi-agi", "abi-res", "abi-tem", "abi-sen"];
const SkillAttrs = ["skl-wpn-light", "skl-wpn-heavy", "skl-wpn-throw", "skl-wpn-fire", "skl-bullshit", "skl-oratory", "skl-empathy", "skl-bargain", "skl-folklore", "skl-letters", "skl-territory", "skl-tradition", "skl-construct", "skl-making", "skl-mecanical", "skl-medicine", "skl-fauna", "skl-flora", "skl-darkness", "skl-stallite"];
const ConditionAttrs = ["cond-exhausted", "cond-wounded", "cond-dying", "cond-encumbered", "cond-overburdened"];
const WoundAttrs = ["wnd1", "wnd2", "wnd3", "wnd4", "wnd5"];
const WeatherAttrs = ["wth1", "wth2", "wth3", "wth4", "wth5"];
const MinMaxAttrs = [...WoundAttrs, ...WeatherAttrs, "wpn1-dmg", "wpn2-dmg", "wpn3-dmg", "wpn4-dmg", "wpn5-dmg", "wpn1-def", "wpn2-def", "wpn3-def", "wpn5-rld", "wpn4-mun", "wpn5-mun", "wpn4-rng1", "wpn4-rng2", "wpn4-rng3", "wpn5-rng1", "wpn5-rng2", "wpn5-rng3", "shd-def", "food-lvl", "drink-lvl", "cloth-lvl", "filter-lvl", "light-lvl"];
const QuantityAttrs = ["food-qtt", "drink-qtt"];
const EncumbranceAttrs = ["wpn1-enc", "wpn2-enc", "wpn3-enc", "wpn4-enc", "wpn5-enc", "arm-enc", "shd-enc", "food-enc", "drink-enc", "cloth-enc", "filter-enc", "light-enc"];
const EncumbrancePenaltyAttrs = ["abi-str", "abi-agi", "skl-wpn-light", "skl-wpn-heavy", "skl-wpn-throw", "skl-wpn-fire", "init", "wpn1", "wpn2", "wpn3", "wpn4", "wpn5", "wpn1-def", "wpn2-def", "wpn3-def", "wpn4-def", "wpn5-def"];

// =============================================================================
// -----------------------------------------------------------------------------
// # Getters
// -----------------------------------------------------------------------------
// =============================================================================

function getAbilityTriggers(b) { // b = button flag ; returns string
	return AbilityAttrs.map(v => (b ? "clicked" : "change") + ":" + v).join(" ");
}

function getSkillTriggers(b) { // b = button flag ; returns string
	return SkillAttrs.map(v => (b ? "clicked" : "change") + ":" + v).join(" ");
}

function getWeaponTriggers() { // returns string
	let i, s = "";
	for (i = 1; i <= 5; i++) {
		s += "clicked:wpn" + i + " ";
		if (i <= 3) s += "clicked:wpn" + i + "-def "; // add parry
	}
	return s.trim();
}

function getMinMaxTriggers() { // returns string
	return MinMaxAttrs.map(v => "change:" + v).join(" ");
}

function getQuantityTriggers() { // returns string
	return QuantityAttrs.map(v => "change:" + v).join(" ");
}

function getEncumbranceTriggers() { // returns string
	return EncumbranceAttrs.map(v => "change:" + v).join(" ");
}

// =============================================================================
// -----------------------------------------------------------------------------
// # Modbar
// -----------------------------------------------------------------------------
// =============================================================================

on("change:mod", e => {
	let n = e.newValue || "0";
	if (n != "0") {
		getAttrs(["mod-reset-show"], v => {
			if (v["mod-reset-show"] == "0") {
				setAttrs({"mod-reset-show" : 1});
			}
		});
	} else {
		setAttrs({"mod-reset-show" : 0});
	}
});

on("clicked:mod-reset", e => {
	setAttrs({"mod" : 0});
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Settings
// -----------------------------------------------------------------------------
// =============================================================================

on("change:whisper-toggle", e => {
	let u = {};
	if (e.newValue == "1") u["wgm"] = "/w gm";
	else u["wgm"] = "";
	setAttrs(u, {"silent" : true});
});

on("change:health-mod", setMaxHealth);
on("change:energy-mod", setMaxEnergy);
on("change:init-mod", setInitiative);
on("change:enc-mod", setMaxEncumbrance);

on("change:cond-autoset", function(e) {
	if (e.newValue == "1") {
		checkEnergyConditions();
		checkWoundConditions();
		checkEncumbranceConditions();
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Abilities
// -----------------------------------------------------------------------------
// =============================================================================

function updateAcrimonyHalf() {
	getAttrs(["abi-acr"], v => {
		setAttrs({"abi-acr-half" : Math.floor(toInt(v["abi-acr"]) / 2)}, {"silent" : true}, function() {
			updateMeleeWeaponValues("abi-acr-half");
		});
	});
}

on(getAbilityTriggers(), e => {
	if (e.sourceType == "sheetworker") {
		let k = e.sourceAttribute;
		if (k == "abi-str") {
			setMaxHealth();
			setMaxEncumbrance();
		} else if (k == "abi-acr") {
			setMaxEnergy();
			updateMeleeWeaponValues(k);
			updateAcrimonyHalf();
		}
		else if (k == "abi-res") setMaxHealth();
		else if (k == "abi-tem") setMaxEnergy();
		else if (k == "abi-agi" || k == "abi-sen") setInitiative();
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Skills
// -----------------------------------------------------------------------------
// =============================================================================

on(getSkillTriggers(), e => {
	if (e.sourceType == "sheetworker") {
		let k = e.sourceAttribute;
		if (k == "skl-wpn-light" || k == "skl-wpn-heavy") updateMeleeWeaponValues(k);
		else if (k == "skl-wpn-throw") updateThrownWeaponValues();
		else if (k == "skl-wpn-fire") updateFireWeaponValues();
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Resources and Values
// -----------------------------------------------------------------------------
// =============================================================================

function setHealth() {
	let a = [...WoundAttrs, ...WeatherAttrs];
	getAttrs(["health_max", ...a], v => {
		let n = toInt(v["health_max"]);
		let i;
		for (i in a) n -= toInt(v[a[i]]);
		setAttrs({"health" : Math.max(n, 0)}, {"silent" : true});
	});
}

function setMaxHealth() {
	getAttrs(["abi-str", "abi-res", "health-mod"], v => {
		let n = toInt(v["abi-str"]) + toInt(v["abi-res"]) * 2 + toInt(v["health-mod"]);
		setAttrs({"health_max" : Math.max(n, 0)}, {"silent" : true});
	});
}

function setMaxEnergy() {
	getAttrs(["abi-acr", "abi-tem", "energy", "energy-mod"], v => {
		let u = {};
		let n = toInt(v["energy"]);
		let m = Math.max(toInt(v["abi-acr"]) + toInt(v["abi-tem"]) + toInt(v["energy-mod"]), 0);
		if (n > m) u["energy"] = m;
		u["energy_max"] = m;
		setAttrs(u, {"silent" : true});
	});
}

function setInitiative() {
	getAttrs(["abi-agi", "abi-sen", "init-mod"], v => {
		let n = toInt(v["abi-agi"]) + toInt(v["abi-sen"]) + toInt(v["init-mod"]);
		setAttrs({"init" : Math.max(n, 0)}, {"silent" : true});
	});
}

function setMaxEncumbrance() {
	getAttrs(["abi-str", "enc-mod"], v => {
		let n = toInt(v["abi-str"]) + toInt(v["enc-mod"]);
		setAttrs({"enc_max" : Math.max(n, 0)}, {"silent" : true});
	});
}

on("change:health_max", setHealth);

// =============================================================================
// -----------------------------------------------------------------------------
// # Conditions
// -----------------------------------------------------------------------------
// =============================================================================

function checkEnergyConditions() {
	getAttrs(["abi-acr", "abi-tem", "energy", "cond-exhausted", "cond-autoset"], v => {
		let u = {};
		let n = toInt(v["energy"]);
		let m = toInt(v["abi-acr"]) + toInt(v["abi-tem"]);
		if (n > m) {
			n = m;
			u["energy"] = m;
		} else if (n < 0) {
			n = 0;
			u["energy"] = 0;
		}
		if (v["cond-autoset"] == "1") {
			if (v["cond-exhausted"] == "0" && n == 0) u["cond-exhausted"] = 1;
			else if (v["cond-exhausted"] == "1" && n > 0) u["cond-exhausted"] = 0;
		}
		if (Object.keys(u).length > 0) setAttrs(u, {"silent" : true});
	});
}

function checkWoundConditions() {
	let a = [...WoundAttrs, "cond-autoset"];
	getAttrs(a, v => {
		let u = {};
		if (v["cond-autoset"] == "1") {
			let i;
			let n;
			u["cond-dying"] = 0;
			u["cond-wounded"] = 0;
			for (i = 0; i < a.length; i++) {
				n = toInt(v[a[i]]);
				if (n > 6) {
					u["cond-wounded"] = 1;
					u["cond-dying"] = 1;
				} else if (n > 3) {
					u["cond-wounded"] = 1;
				}
			}
		}
		setAttrs(u, {"silent" : true}, setHealth);
	});
}

function checkEncumbranceConditions() {
	getAttrs(["abi-str", "enc", "enc-mod", "cond-autoset"], v => {
		let u = {};
		let n = toInt(v["enc"]);
		let m = toInt(v["abi-str"]) + toInt(v["enc-mod"]);
		if (n < 0) {
			n = 0;
			u["enc"] = 0; // force format
		}
		if (v["cond-autoset"] == "1") {
			u["cond-encumbered"] = 0;
			u["cond-overburdened"] = 0;
			if (n == m + 1) {
				u["cond-encumbered"] = 1;
			} else if (n > m + 1) {
				u["cond-encumbered"] = 1;
				u["cond-overburdened"] = 1;
			}
		}
		setAttrs(u, {"silent" : true});
	});
};

on("change:energy change:energy_max", checkEnergyConditions);

on(WoundAttrs.map(v => "change:" + v).join(" "), e => {
	if (e.sourceType == "sheetworker") {
		checkWoundConditions();
	}
});

on(WeatherAttrs.map(v => "change:" + v).join(" "), setHealth);

on("change:enc change:enc_max", e => {
	if (e.sourceType == "sheetworker") {
		checkEncumbranceConditions()
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Weapons
// -----------------------------------------------------------------------------
// =============================================================================

function updateMeleeWeaponValues(k) {
	let a = ["wpn1-sel", "wpn2-sel", "wpn3-sel", k];
	getAttrs(a, v => {
		let u = {};
		let i;
		for (i in a) {
			if (v[a[i]] == k) {
				u[crop(a[i], 4)] = toInt(v[k]);
			}
		}
		setAttrs(u, {"silent" : true});
	});
}

function updateThrownWeaponValues() {
	getAttrs(["skl-wpn-throw"], v => {
		setAttrs({"wpn4" : v["skl-wpn-throw"]}, {"silent" : true});
	});
}

function updateFireWeaponValues() {
	getAttrs(["skl-wpn-fire"], v => {
		setAttrs({"wpn5" : v["skl-wpn-fire"]}, {"silent" : true});
	});
}

on("change:wpn1-sel change:wpn2-sel change:wpn3-sel", e => {
	let s = e.newValue;
	let k = crop(e.sourceAttribute, 4);
	getAttrs([s], v => {
		let u = {};
		u[k] = v[s];
		setAttrs(u);
	});
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Armor and Shield
// -----------------------------------------------------------------------------
// =============================================================================

function checkArmorFormula() {
	getAttrs(["arm"], v => {
		let s = v["arm"];
		if (s != null) {
			s = formatFormula(s, "arm"); // force format
			setAttrs({"arm" : s}, {"silent" : true});
		}
	});
}

on("change:arm", e => {
	if (e.sourceType == "player") {
		checkArmorFormula();
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Encumbrance
// -----------------------------------------------------------------------------
// =============================================================================

function updateEncumbrance() {
	getSectionIDs("items", function(ids) {
		let a = [...EncumbranceAttrs];
		let b = [...QuantityAttrs];
		ids.forEach(o => {
			a.push(`repeating_items_${o}_enc`);
			b.push(`repeating_items_${o}_qtt`);
		});
		getAttrs(a.concat(b), v => {
			let q;
			let n = 0;
			a.forEach(o => {
				q = 1;
				if (o.startsWith("repeating_")
					|| o == "food-enc"
					|| o == "drink-enc") q = toInt(v[crop(o, 3) + "qtt"]); // has quantity
				n += toInt(v[o]) * q;
			});
			setAttrs({"enc" : n}, {"silent" : true}, checkEncumbranceConditions);
		});
	});
}

on(getEncumbranceTriggers() + " " + getQuantityTriggers() + " change:repeating_items:qtt change:repeating_items:enc remove:repeating_items", e => {
	if (e.sourceType == "sheetworker") {
		updateEncumbrance();
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Min-Max
// -----------------------------------------------------------------------------
// =============================================================================

const MinMax = {
	// "health : [0, NaN],
	// "health_max : [0, NaN],
	// "energy : [0, NaN],
	// "energy_max : [0, NaN],
	// "init : [0, NaN],
	"abi" : [0, 10],
	"skl" : [0, 10],
	"wnd" : [0, 50],
	"wth" : [0, 10],
	"dmg" : [-5, 20],
	"def" : [0, 5],
	"rld" : [0, 10],
	"mun" : [0, 99],
	"rng" : [0, 999],
	"qtt" : [0, 999],
	"enc" : [0, 10],
	"lvl" : [0, 3]
};

function getMin(k) { // k = key ; returns number
	return MinMax[k][0];
}

function getMax(k) { // k = key ; returns number
	return MinMax[k][1];
}

function getMinMaxKey(s) { // s = string ; returns string
	let k;
	if (s.startsWith("abi-")) k = "abi";
	else if (s.startsWith("skl-")) k = "skl";
	else if (s.startsWith("wnd")) k = "wnd";
	else if (s.startsWith("wth")) k = "wth";
	else if (s.endsWith("-dmg")) k = "dmg";
	else if (s.endsWith("-def")) k = "def";
	else if (s.endsWith("-rld")) k = "rld";
	else if (s.endsWith("-mun")) k = "mun";
	else if (crop(s, 1).endsWith("-rng")) k = "rng";
	else if (s.endsWith("-qtt") || s.endsWith("_qtt")) k = "qtt";
	else if (s.endsWith("-enc") || s.endsWith("_enc")) k = "enc";
	else if (s.endsWith("-lvl")) k = "lvl";
	return k;
}

on(getAbilityTriggers() + " " + getSkillTriggers() + " " + getMinMaxTriggers() + " " + getEncumbranceTriggers() + " " + getQuantityTriggers() + " change:repeating_items:qtt change:repeating_items:enc remove:repeating_items", e => {
	if (e.sourceType == "player") {
		let s = e.sourceAttribute;
		let n = e.newValue;
		let k = getMinMaxKey(s);
		let d = 0;
		let u = {};
		if (k) {
			u[s] = clamp(n, getMin(k), getMax(k), d); // force format
			setAttrs(u);
		}
	}
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Recalc
// -----------------------------------------------------------------------------
// =============================================================================

function recalculate() {
	getSectionIDs("items", function(ids) {
		let a = [...AbilityAttrs, ...SkillAttrs, ...MinMaxAttrs, ...QuantityAttrs, ...EncumbranceAttrs];
		let b = ["health-mod", "energy-mod", "init-mod", "enc-mod", "energy", "wpn1-sel", "wpn2-sel", "wpn3-sel"];
		ids.forEach(o => {
			a.push(`repeating_items_${o}_enc`);
			a.push(`repeating_items_${o}_qtt`);
		});
		getAttrs(a.concat(b), v => {
			let k, n, d;
			let u = {};
			// Min-Max
			a.forEach(o => {
				k = getMinMaxKey(o);
				n = toInt(v[o]);
				d = 0;
				if (k) u[o] = clamp(n, getMin(k), getMax(k), d); // force format
			});
			// Abilities
			u["abi-acr-half"] = Math.floor(u["abi-acr"] / 2);
			// Health
			u["health_max"] = Math.max(u["abi-str"] + u["abi-res"] * 2 + toInt(v["health-mod"]), 0);
			// Energy
			u["energy_max"] = Math.max(u["abi-acr"] + u["abi-tem"] + toInt(v["energy-mod"]), 0);
			if (toInt(v["energy"]) > u["energy_max"]) u["energy"] = u["energy_max"];
			// Initiative
			u["init"] = Math.max(u["abi-agi"] + u["abi-sen"] + toInt(v["init-mod"]), 0);
			// Encumbrance
			u["enc_max"] = Math.max(u["abi-str"] + toInt(v["enc-mod"]), 0);
			// Weapons
			u["wpn1"] = u[v["wpn1-sel"]];
			u["wpn2"] = u[v["wpn2-sel"]];
			u["wpn3"] = u[v["wpn3-sel"]];
			u["wpn4"] = u["skl-wpn-throw"];
			u["wpn5"] = u["skl-wpn-fire"];
			// Modbar
			u["mod"] = 0;
			u["mod-reset-show"] = 0;
			// Update
			setAttrs(u, {"silent" : true}, () => {
				checkEnergyConditions();
				checkWoundConditions();
				updateEncumbrance();
				checkArmorFormula();
				console.info("Dark Earth (Simplified Rules) Character Sheet recalculated!"); // DEBUG
			});
		});
	});
}

on("clicked:recalc", recalculate);

// =============================================================================
// -----------------------------------------------------------------------------
// # Roll
// -----------------------------------------------------------------------------
// =============================================================================

on(getAbilityTriggers(true) + " " + getSkillTriggers(true) + " " + getWeaponTriggers() + " clicked:roll clicked:init clicked:arm", e => {
	let k = e.triggerName.substr(8);
	let a = [k, ...ConditionAttrs, "mod", "mod-autoreset", "wpn-def-shd", "shd-def", "shd-eqp", "wpn-str-half"];
	let is_def = k.endsWith("def");
	if (is_def) {
		k = crop(k, 4); // wpn1-def => wpn1
		a.push(k);
	}
	let is_roll = k == "roll";
	let is_init = k == "init";
	let is_wpn = k.startsWith("wpn");
	let is_arm = k.startsWith("arm");
	let has_name = is_wpn || is_arm;
	if (is_wpn) {
		a.push(k + "-dmg");
		a.push(k + "-str");
		a.push("abi-str");
		if (k == "wpn1" || k == "wpn2" || k == "wpn3") a.push(k + "-spec");
		if (k == "wpn4" || k == "wpn5") a.push(...[k + "-rng1", k + "-rng2", k + "-rng3"]);
	}
	if (has_name) a.push(k + "-name");
	getAttrs(a, v => {
		let base;
		let def = is_def ? toInt(v[k + "-def"]) + (v["wpn-def-shd"] == "1" && v["shd-eqp"] == "1" ? toInt(v["shd-def"]) : 0) : 0;
		let mod = toInt(v["mod"]) + def;
		let val = 0;
		if (is_arm) {
			let reg = v[k].match(/^\+?(\d+d)?\s*([\+\-]?\s*\d+)?$/i)
			base = toInt((reg[1] || "0").replace(/d/i, ""));
			val = toInt(reg[2] || "0");
		} else {
			base = toInt(v[k]);
		}
		// Conditions
		let zero_die = false;
		let exhausted = toInt(v["cond-exhausted"]);
		let wounded = toInt(v["cond-wounded"]);
		let dying = toInt(v["cond-dying"]);
		let encumbered = toInt(v["cond-encumbered"]);
		let overburdened = toInt(v["cond-overburdened"]);
		let mod_reset = mod != 0 && v["mod-autoreset"] == "1";
		if (!is_roll && !is_arm) {
			if (dying) mod -= is_init ? 4 : 2;
			else if (wounded) mod -= is_init ? 2 : 1;
		}
		if (EncumbrancePenaltyAttrs.includes(k)) { // check is penalized by encumbrance
			if (overburdened) mod -= is_init ? 4 : 2;
			else if (encumbered) mod -= is_init ? 2 : 1;
		}
		// Roll
		let num = Math.max(base + mod, 0);
		let roll = num + "d6";
		if (num == 0 && val == 0) { // 0D
			zero_die = true;
			roll = "1d6";
		}
		if (val != 0) roll += (val > 0 ? "+" : "") + val;
		// Name
		let name = has_name ? v[k + "-name"] : getLang(k);
		if (name == "") {
			if (is_arm) name = getLang("arm-prot");
			else if (is_wpn) name = getLang(k + "-lbl");
		}
		if (is_def) name += " (" + getLang("wpn-parry") + ")";
		// Expression
		let expr = [
			"@{wgm}",
			"&{template:roll}",
			"{{type=@{sheet-type}}}",
			"{{char=@{char-name}}}",
			"{{title=" + name + "}}",
			"{{roll=[[" + roll + "]]}}",
			"{{base=[[" + base + "]]}}",
			"{{mod=[[" + mod + "]]}}"
		];
		if (val != 0) expr.push("{{val=[[" + val + "]]}}");
		if (zero_die) expr.push("{{zero-die=true}}");
		if (!is_roll && !is_arm) {
			if (exhausted) expr.push("{{exhausted=true}}");
			if (dying) expr.push("{{dying=true}}");
			else if (wounded) expr.push("{{wounded=true}}");
			if (overburdened) expr.push("{{overburdened=true}}");
			else if (encumbered) expr.push("{{encumbered=true}}");
		}
		// Damage
		if (is_wpn) {
			if (k == "wpn1" || k == "wpn2" || k == "wpn3") expr.push("{{spec=" + v[k + "-spec"] + "}}");
			if (k == "wpn4" || k == "wpn5") expr.push("{{spec=" + getLang("wpn-rng") + " " +v[k + "-rng1"] + "/" + v[k + "-rng2"] + "/" + v[k + "-rng3"] + "}}");
			if (!is_def) {
				let dmg = toInt(v[k + "-dmg"]);
				if (v[k + "-str"] == "1") {
					let str_mod = toInt(v["abi-str"]);
					dmg += v["wpn-str-half"] == "1" ? Math.floor(str_mod/ 2) : str_mod;
				}
				expr.push("{{dmg=[[" + dmg + "]]}}");
			}
		}
		startRoll(expr.join(" "), r => {
			let a = r.results.roll.dice;
			let i = 0;
			let s = 0; // total of successes
			let f = 0; // number of 1-failures
			if (zero_die) { // 0D
				if (a[0] == 6) s = 1;
				else if (a[0] == 1) f = 1;
			} else if (num > 0) {
				for (i = 0; i < a.length; i++) {
					if (a[i] == 1) f++;
					if (a[i] == 6) s += is_arm ? 1 :2; // only 1 if arm
					else if (a[i] >= 4) s++;
				}
			}
			if (!is_roll && !is_arm && f == a.length && num > 0) { // fumble
				s = getLang("roll-fumble");
			} else if (!is_roll && !is_arm && exhausted && f > 0) { // exhaustion
				s = getLang("roll-exhaustion");
			} else { // number of successes
				if (val != 0) s = Math.max(s + val, 0); // no less than zero
				s += getLang("roll-success-suffix");
			}
			finishRoll(r.rollId, {"roll" : s});
			let u = {};
			if (is_roll) u["roll"] = 0;
			if (is_init) u["init-last"] = Number.isInteger(s) ? s : 0;
			if (mod_reset) {
				u["mod"] = 0;
				u["mod-reset-show"] = 0;
			}
			if (Object.keys(u).length > 0) setAttrs(u, {"silent" : true});
		});
	});
});

// =============================================================================
// -----------------------------------------------------------------------------
// # Version
// -----------------------------------------------------------------------------
// =============================================================================

const updateSheetVersion = {
	"1.01" : function() {
		setAttrs({"sheet-theme" : "default"});
	}
};

function initializeSheet() {
	setAttrs({"sheet-init" : "1"}, {"silent" : true});
};

function updateSheetLanguage() {};

function checkVersion() {
	getAttrs(["sheet-version", "sheet-init", "sheet-lang"], v => {
		let n = parseFloat(v["sheet-version"]);
		let s = getTranslationLanguage();
		let c1 = v["sheet-init"] == "0";
		let c2 = n < Sheet.version;
		let c3 = v["sheet-lang"] != s;
		let u = {};
		if (c1 || c2 || c3) {
			if (c1 || c2) {
				u["sheet-version"] = Sheet.version.toFixed(2);
				if (c1) {
					console.info(Sheet.name + " Character Sheet being initialized"); // DEBUG
					initializeSheet();
				} else if (c2) {
					if (n < 1.01) updateSheetVersion["1.01"]();
					console.info(Sheet.name + " Character Sheet updated to version " + Sheet.version); // DEBUG
				}
			}
			if (c3) {
				updateSheetLanguage();
				u["sheet-lang"] = s;
			}
			setAttrs(u, {"silent" : true});
		} else {
			console.info(Sheet.name + " Character Sheet v" + Sheet.version.toFixed(2) + " loaded"); // DEBUG
		}
	});
};

// =============================================================================
// -----------------------------------------------------------------------------
// # Opening
// -----------------------------------------------------------------------------
// =============================================================================

on("sheet:opened", () => {
	checkVersion();
});
