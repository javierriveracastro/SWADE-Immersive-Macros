import { unshake_swd_script, unshake_swade_script } from './swim_modules/unshake.js'
import { unstun_script } from './swim_modules/unstun.js'
import { deviation_script } from './swim_modules/deviation.js'

export class api {

  static registerFunctions() {
    console.log("SWIM API initialised.")
    api.globals()
  }

  static globals() {
    globalThis['swim'] = {
      // Utility
      get_macro_variables: api._get_macro_variables,
      critFail_check: api._critFail_check,
      get_benny_image: api._get_benny_image,
      check_bennies: api._check_bennies,
      spend_benny: api._spend_benny,
      // Convenience
      deviation: api._deviation,
      unshake: api._unshake,
      unstun: api._unstun
    }
  }

  /*******************************************
   * Utility scripts
   * - Get Macro Variables
   * - Crit Fail Check
   * - Get Benny Image
   * - Check Bennies
   * - Spend Benny
   ******************************************/

  // Get Macro Variables
  static async _get_macro_variables() {
    // Add variables to the evaluation scope
    const speaker = ChatMessage.implementation.getSpeaker();
    const character = game.user.character;
    const actor = game.actors.get(speaker.actor);
    const token = (canvas.ready ? canvas.tokens.get(speaker.token) : null);
    return { speaker, character, actor, token }
  }
  // Crit Fail check
  static async _critFail_check(wildCard, r) {
    let critFail = false;
    if ((isSame_bool(r.dice) && isSame_numb(r.dice) === 1) && wildCard === false) {
      const failCheck = await new Roll("1d6x[Test for Critical Failure]").evaluate({ async: true });
      failCheck.toMessage()
      if (failCheck.dice[0].values[0] === 1) { critFail = true; }
    } else if (wildCard === true) {
      if (isSame_bool(r.dice) && isSame_numb(r.dice) === 1) { critFail = true }
    }
    // Functions to determine a critical failure. This one checks if all dice rolls are the same.
    function isSame_bool(d = []) {
      return d.reduce((c, a, i) => {
        if (i === 0) return true;
        return c && a.total === d[i - 1].total;
      }, true);
    }

    // Functions to determine a critical failure. This one checks what the number of the "same" was.
    function isSame_numb(d = []) {
      return d.reduce((c, a, i) => {
        if (i === 0 || d[i - 1].total === a.total) return a.total;
        return null;
      }, 0);
    }
    return critFail;
  }
  // Get Benny Image
  static async _get_benny_image() {
    let bennyImage = "systems/swade/assets/bennie.webp"
    let benny_Back = game.settings.get('swade', 'bennyImage3DBack')
    if (benny_Back) {
      bennyImage = benny_Back
    }
    return bennyImage
  }
  // Check Bennies
  static async _check_bennies(token) {
    let tokenBennies = token.actor.data.data.bennies.value;
    let gmBennies
    let totalBennies
    //Check for actor status and adjust bennies based on edges.
    let actorLuck = token.actor.data.items.find(function (item) { return (item.name.toLowerCase() === "luck") });
    let actorGreatLuck = token.actor.data.items.find(function (item) { return (item.name.toLowerCase() === "great luck") });
    if ((token.actor.data.data.wildcard === false) && (actorGreatLuck === undefined)) {
      if ((!(actorLuck === undefined)) && (tokenBennies > 1) && ((actorGreatLuck === undefined))) { tokenBennies = 1; }
      else { tokenBennies = 0; }
    }

    // Non GM token has <1 bennie OR GM user AND selected token has <1 benny
    if ((!game.user.isGM && tokenBennies < 1) || (game.user.isGM && tokenBennies < 1 && game.user.getFlag("swade", "bennies") < 1)) {
      ui.notifications.warn("You have no more bennies left.");
    }
    if (game.user.isGM) {
      gmBennies = game.user.getFlag("swade", "bennies");
      totalBennies = tokenBennies + gmBennies
    }
    else {
      totalBennies = tokenBennies
    }
    return { tokenBennies, gmBennies, totalBennies }
  }
  // Spend Benny
  static async _spend_benny(token, sendMessage) {
    let { tokenBennies, gmBennies, totalBennies } = await swim.check_bennies(token)
    //Subtract the spend, use GM benny if user is GM and token has no more bennies left or spend token benny if user is player and/or token has bennies left.
    if (totalBennies < 1) {
      return ui.notifications.warn("You have no more bennies left.");
    } else if (game.user.isGM && tokenBennies < 1 && gmBennies >= 1) {
      await game.user.setFlag("swade", "bennies", game.user.getFlag("swade", "bennies") - 1)
    } else {
      await token.actor.update({
        "data.bennies.value": tokenBennies - 1,
      })
    }

    //Show the Benny Flip
    if (game.dice3d) {
      game.dice3d.showForRoll(new Roll("1dB").evaluate({ async: false }), game.user, true, null, false);
    }

    if (sendMessage === true) {
      const bennyImage = await swim.get_benny_image()
      ChatMessage.create({
        user: game.user.id,
        content: `<p><img style="border: none;" src="${bennyImage}"" width="25" height="25" /> ${game.user.name} spent a Benny for ${token.name}.</p>`,
      });
    }
  }

  /*******************************************
   * Convenience aka "automation" scripts
   * - Deviation
   * - (Un-)Shake
   * - (Un-)Stun
   ******************************************/

  // Deviation
  static async _deviation() {
    deviation_script()
  }

  // Unshake script
  static async _unshake(version) {
    if (version === "SWD") { unshake_swd_script() }
    else if (version === "SWADE") { unshake_swade_script() }
  }

  // Unstun script
  static async _unstun() {
    unstun_script()
  }

  /* Call Macros (Deprecated as of version 0.15.0)
  static async start_macro(macroName, compendiumName = 'swim.swade-immersive-macros') {
    let pack = game.packs.get(compendiumName);
    let macro = (await pack.getDocuments()).find(i => (i.data.name == macroName));
    await macro.execute();
  }
  */

  //In the Check for Bennies function, don't forget Coup (50F) which always adds a Benny even if it is an Extra.
}