/**
 * Utility functions for DCC character calculations
 */

/**
 * Calculate DCC modifier for an ability score
 * @param {number} score - The ability score
 * @returns {number} The modifier
 */
export function getDCCModifier(score) {
    // DCC RPG ability score modifier table
    if (score <= 3) return -3;
    if (score <= 5) return -2;
    if (score <= 8) return -1;
    if (score <= 12) return 0;
    if (score <= 15) return +1;
    if (score <= 17) return +2;
    if (score <= 19) return +3;
    if (score <= 21) return +4;
    if (score <= 23) return +5;
    return +6; // 24+
}

/**
 * Update attribute modifiers in the UI
 */
export function updateAttributeModifiers() {
    ['strength', 'agility', 'stamina', 'personality', 'intelligence', 'luck'].forEach(attr => {
        const base = parseInt(document.getElementById(`${attr}-base`)?.value) || 10;

        // Always calculate modifier from base only, never temporary
        const modifier = getDCCModifier(base);

        const modifierEl = document.getElementById(`${attr}-modifier`);
        if (modifierEl) {
            modifierEl.textContent = modifier >= 0 ? `+${modifier}` : modifier;
        }
    });
}

/**
 * Collect equipment from the form
 * @returns {Array} Array of equipment items
 */
export function collectEquipmentFromForm() {
    const items = [];
    document.querySelectorAll('.equipment-item').forEach(div => {
        const type = div.querySelector('.eq-type')?.value;
        const equippedCheckbox = div.querySelector('.eq-equipped');
        const weightInput = div.querySelector('.eq-weight');
        const item = {
            id: div.dataset.id,
            name: div.querySelector('.eq-name')?.value || '',
            quantity: parseInt(div.querySelector('.eq-quantity')?.value) || 1,
            weight: weightInput ? parseFloat(weightInput.value) || 0 : 0,
            category: type,
            description: div.querySelector('.eq-description')?.value || '',
            equipped: equippedCheckbox ? equippedCheckbox.checked : false,
            isActive: div.dataset.isActive === '1'
        };

        // Add weapon-specific fields
        if (type === 'weapon') {
            const damageDice = div.querySelector('.eq-damage-dice');
            const attackBonus = div.querySelector('.eq-attack-bonus');
            if (damageDice) item.damageDice = damageDice.value;
            if (attackBonus) item.attackBonus = parseInt(attackBonus.value) || 0;
        }

        // Add armor-specific fields
        if (type === 'armor') {
            const acBonus = div.querySelector('.eq-ac-bonus');
            const fortitude = div.querySelector('.eq-fortitude');
            const reflex = div.querySelector('.eq-reflex');
            const willpower = div.querySelector('.eq-willpower');
            if (acBonus) item.acBonus = parseInt(acBonus.value) || 0;
            if (fortitude) item.fortitudeSave = parseInt(fortitude.value) || 0;
            if (reflex) item.reflexSave = parseInt(reflex.value) || 0;
            if (willpower) item.willpowerSave = parseInt(willpower.value) || 0;
        }

        items.push(item);
    });
    return items;
}

/**
 * Calculate and update UI for calculated values (saves, AC with equipment bonuses)
 * @param {Object} currentCharacter - The current character object
 */
export function updateCalculatedValues(currentCharacter) {
    if (!currentCharacter) return;

    // Get equipment bonuses
    const equipment = collectEquipmentFromForm();
    let reflexBonus = 0;
    let fortitudeBonus = 0;
    let willpowerBonus = 0;
    let acBonus = 0;

    equipment.forEach(item => {
        if (item.isActive && item.equipped && item.category === 'armor') {
            if (item.reflexSave) reflexBonus += item.reflexSave;
            if (item.fortitudeSave) fortitudeBonus += item.fortitudeSave;
            if (item.willpowerSave) willpowerBonus += item.willpowerSave;
            if (item.acBonus) acBonus += item.acBonus;
        }
    });

    // Get base save values
    const baseReflex = parseInt(document.getElementById('reflex')?.value) || 0;
    const baseFortitude = parseInt(document.getElementById('fortitude')?.value) || 0;
    const baseWillpower = parseInt(document.getElementById('willpower')?.value) || 0;
    const baseAC = parseInt(document.getElementById('armorClass')?.value) || 10;

    // Calculate ability modifiers (always use base, never temporary)
    const agilityBase = parseInt(document.getElementById('agility-base')?.value) || 10;
    const staminaBase = parseInt(document.getElementById('stamina-base')?.value) || 10;
    const personalityBase = parseInt(document.getElementById('personality-base')?.value) || 10;

    const agilityMod = getDCCModifier(agilityBase);
    const staminaMod = getDCCModifier(staminaBase);
    const personalityMod = getDCCModifier(personalityBase);

    // Calculate totals (DCC rules: Agility affects Reflex, Stamina affects Fortitude, Personality affects Willpower)
    const totalReflex = baseReflex + reflexBonus + agilityMod;
    const totalFortitude = baseFortitude + fortitudeBonus + staminaMod;
    const totalWillpower = baseWillpower + willpowerBonus + personalityMod;
    const totalAC = baseAC + acBonus + agilityMod;

    // Update UI - Always show calculated values with tooltips
    const reflexEl = document.getElementById('reflex-total');
    const fortitudeEl = document.getElementById('fortitude-total');
    const willpowerEl = document.getElementById('willpower-total');
    const acEl = document.getElementById('ac-total');

    if (reflexEl) {
        // Build tooltip for Reflex
        let reflexTooltip = `Base: ${baseReflex}`;
        if (agilityMod !== 0) {
            reflexTooltip += `\nFrom Agility Mod: ${agilityMod >= 0 ? '+' : ''}${agilityMod}`;
        }
        if (reflexBonus !== 0) {
            reflexTooltip += `\nFrom Armor: ${reflexBonus >= 0 ? '+' : ''}${reflexBonus}`;
        }
        reflexTooltip += `\nTotal: ${totalReflex}`;
        reflexEl.textContent = `(${totalReflex})`;
        reflexEl.title = reflexTooltip;
        reflexEl.style.display = 'inline';
    }

    if (fortitudeEl) {
        // Build tooltip for Fortitude
        let fortitudeTooltip = `Base: ${baseFortitude}`;
        if (staminaMod !== 0) {
            fortitudeTooltip += `\nFrom Stamina Mod: ${staminaMod >= 0 ? '+' : ''}${staminaMod}`;
        }
        if (fortitudeBonus !== 0) {
            fortitudeTooltip += `\nFrom Armor: ${fortitudeBonus >= 0 ? '+' : ''}${fortitudeBonus}`;
        }
        fortitudeTooltip += `\nTotal: ${totalFortitude}`;
        fortitudeEl.textContent = `(${totalFortitude})`;
        fortitudeEl.title = fortitudeTooltip;
        fortitudeEl.style.display = 'inline';
    }

    if (willpowerEl) {
        // Build tooltip for Willpower
        let willpowerTooltip = `Base: ${baseWillpower}`;
        if (personalityMod !== 0) {
            willpowerTooltip += `\nFrom Personality Mod: ${personalityMod >= 0 ? '+' : ''}${personalityMod}`;
        }
        if (willpowerBonus !== 0) {
            willpowerTooltip += `\nFrom Armor: ${willpowerBonus >= 0 ? '+' : ''}${willpowerBonus}`;
        }
        willpowerTooltip += `\nTotal: ${totalWillpower}`;
        willpowerEl.textContent = `(${totalWillpower})`;
        willpowerEl.title = willpowerTooltip;
        willpowerEl.style.display = 'inline';
    }

    if (acEl) {
        // Build tooltip for AC
        let acTooltip = `Base: ${baseAC}`;
        if (agilityMod !== 0) {
            acTooltip += `\nFrom Agility Mod: ${agilityMod >= 0 ? '+' : ''}${agilityMod}`;
        }
        if (acBonus !== 0) {
            acTooltip += `\nFrom Armor: ${acBonus >= 0 ? '+' : ''}${acBonus}`;
        }
        acTooltip += `\nTotal: ${totalAC}`;
        acEl.textContent = `(${totalAC})`;
        acEl.title = acTooltip;
        acEl.style.display = 'inline';
    }
}
