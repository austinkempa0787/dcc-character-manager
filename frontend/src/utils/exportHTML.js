/**
 * HTML Export utilities for character sheets
 */
import { SaveAndOpenHTML } from '../../wailsjs/go/main/App';

/**
 * Generate and save character sheet as HTML
 * @param {Object} character - The character object
 * @param {boolean} includeFullHistory - Whether to include full history
 * @param {string} dateFrom - Start date for history filter
 * @param {string} dateTo - End date for history filter
 */
export async function generateCharacterSheetHTML(character, includeFullHistory, dateFrom, dateTo) {
    // Filter history by date range if not including full history
    let historyToInclude = character.history || [];
    
    if (!includeFullHistory && dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        
        historyToInclude = historyToInclude.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= fromDate && entryDate <= toDate;
        });
    }
    
    // Calculate attribute modifiers
    const calcMod = (base) => {
        const mod = Math.floor((base - 10) / 2);
        return mod >= 0 ? `+${mod}` : mod;
    };
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${character.name} - DCC Character Sheet</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #2c2416;
            border-bottom: 3px solid #8b7355;
            padding-bottom: 10px;
        }
        h2 {
            color: #5a4a3a;
            border-bottom: 2px solid #d4c4b0;
            padding-bottom: 5px;
            margin-top: 25px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .stat-box {
            border: 2px solid #d4c4b0;
            padding: 10px;
            border-radius: 4px;
        }
        .stat-label {
            font-weight: bold;
            color: #5a4a3a;
            font-size: 0.9em;
        }
        .stat-value {
            font-size: 1.2em;
            margin-top: 5px;
        }
        .attributes-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .attribute {
            text-align: center;
            border: 2px solid #d4c4b0;
            padding: 10px;
            border-radius: 4px;
        }
        .attribute-name {
            font-weight: bold;
            color: #5a4a3a;
            font-size: 0.85em;
        }
        .attribute-value {
            font-size: 1.5em;
            margin: 5px 0;
        }
        .attribute-mod {
            font-size: 1.1em;
            color: #8b5a3c;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #d4c4b0;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f0e8d8;
            font-weight: bold;
            color: #5a4a3a;
        }
        .history-entry {
            border-left: 3px solid #8b7355;
            padding: 10px;
            margin: 10px 0;
            background: #faf8f3;
        }
        .history-date {
            font-weight: bold;
            color: #5a4a3a;
            margin-bottom: 5px;
        }
        .history-note {
            font-style: italic;
            color: #666;
            margin-top: 5px;
        }
        .export-info {
            text-align: center;
            color: #888;
            font-size: 0.9em;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #d4c4b0;
        }
        @media print {
            body {
                padding: 0;
            }
            .export-info {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <h1>${character.name}</h1>
    
    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-label">Level</div>
            <div class="stat-value">${character.level || 0}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Alignment</div>
            <div class="stat-value">${['Neutral', 'Lawful', 'Chaotic'][character.alignment] || 'Neutral'}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">HP</div>
            <div class="stat-value">${character.currentHealth} / ${character.maxHealth}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">AC</div>
            <div class="stat-value">${character.armorClass}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Initiative</div>
            <div class="stat-value">${character.initiative || 0}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Speed</div>
            <div class="stat-value">${character.speed || 30}</div>
        </div>
    </div>

    <h2>Attributes</h2>
    <div class="attributes-grid">
        <div class="attribute">
            <div class="attribute-name">STR</div>
            <div class="attribute-value">${character.strength.base}</div>
            ${character.strength.temporary && character.strength.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.strength.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.strength.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">AGI</div>
            <div class="attribute-value">${character.agility.base}</div>
            ${character.agility.temporary && character.agility.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.agility.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.agility.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">STA</div>
            <div class="attribute-value">${character.stamina.base}</div>
            ${character.stamina.temporary && character.stamina.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.stamina.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.stamina.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">PER</div>
            <div class="attribute-value">${character.personality.base}</div>
            ${character.personality.temporary && character.personality.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.personality.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.personality.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">INT</div>
            <div class="attribute-value">${character.intelligence.base}</div>
            ${character.intelligence.temporary && character.intelligence.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.intelligence.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.intelligence.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">LCK</div>
            <div class="attribute-value">${character.luck.base}</div>
            ${character.luck.temporary && character.luck.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.luck.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.luck.base)}</div>
        </div>
    </div>

    <h2>Saving Throws</h2>
    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-label">Reflex</div>
            <div class="stat-value">${character.saves.reflex}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Fortitude</div>
            <div class="stat-value">${character.saves.fortitude}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Willpower</div>
            <div class="stat-value">${character.saves.willpower}</div>
        </div>
    </div>

    ${character.classes && character.classes.length > 0 ? `
    <h2>Classes</h2>
    <table>
        <tr>
            <th>Class</th>
            <th>Level</th>
            <th>Description</th>
        </tr>
        ${character.classes.filter(c => c.isActive).map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.level}</td>
            <td>${c.description || ''}</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    ${character.equipment && character.equipment.filter(e => e.isActive).length > 0 ? `
    <h2>Equipment</h2>
    <table>
        <tr>
            <th>Item</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Equipped</th>
            <th>Details</th>
        </tr>
        ${character.equipment.filter(e => e.isActive).map(e => `
        <tr>
            <td>${e.name}</td>
            <td>${e.category || e.type || 'item'}</td>
            <td>${e.quantity}</td>
            <td>${e.equipped ? '✓' : ''}</td>
            <td>
                ${e.damageDice ? `Damage: ${e.damageDice}` : ''}
                ${e.attackBonus ? ` +${e.attackBonus} to hit` : ''}
                ${e.acBonus ? `AC: ${e.acBonus >= 0 ? '+' : ''}${e.acBonus}` : ''}
                ${e.description || ''}
            </td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    ${character.abilities && character.abilities.filter(a => a.isActive).length > 0 ? `
    <h2>Abilities & Powers</h2>
    <table>
        <tr>
            <th>Name</th>
            <th>Page</th>
            <th>Description</th>
        </tr>
        ${character.abilities.filter(a => a.isActive).map(a => `
        <tr>
            <td>${a.name}</td>
            <td>${a.pageNumber || ''}</td>
            <td>${a.description || ''}</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    ${character.notes ? `
    <h2>Notes</h2>
    <div style="white-space: pre-wrap; padding: 10px; background: #faf8f3; border: 1px solid #d4c4b0; border-radius: 4px;">
${character.notes}
    </div>
    ` : ''}

    ${historyToInclude.length > 0 ? `
    <h2>Activity History${!includeFullHistory && dateFrom && dateTo ? ` (${dateFrom} to ${dateTo})` : ''}</h2>
    ${historyToInclude.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(entry => `
    <div class="history-entry">
        <div class="history-date">${new Date(entry.timestamp).toLocaleString()}</div>
        <div>
            ${entry.changes && entry.changes.length > 0 ? entry.changes.join('<br>') : ''}
        </div>
        ${entry.note ? `<div class="history-note">"${entry.note}"</div>` : ''}
    </div>
    `).join('')}
    ` : ''}

    <div class="export-info">
        Character sheet exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
        DCC Character Sheet Manager
    </div>
</body>
</html>`;
    
    // Save and open the HTML file
    try {
        const filepath = await SaveAndOpenHTML(html, character.name);
        alert(`Character sheet saved to:\n${filepath}\n\nThe file has been opened in your browser. Use Print > Save as PDF to create a PDF.`);
    } catch (err) {
        console.error('Failed to save/open HTML:', err);
        alert('Failed to save character sheet: ' + err);
    }
}
