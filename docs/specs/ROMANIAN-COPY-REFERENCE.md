# Weekly Digest - Romanian Copy Reference

**Quick reference for natural Romanian email copy**

---

## Subject Lines by Scenario

### New User (No Progress)

**Template**: `Începe călătoria ta civică în {entityName}`

**Examples**:

- Începe călătoria ta civică în București
- Începe călătoria ta civică în Cluj-Napoca
- Începe călătoria ta civică în Timișoara

---

### In Progress (Continue Current)

**Template**: `Continuă provocarea ta la {entityName}`

**Examples**:

- Continuă provocarea ta la București
- Continuă provocarea ta în Cluj
- Revenim la provocarea din Iași?

---

### Completed This Week (Celebrate)

**Template**: `Felicitări! Ai terminat "{challengeTitle}" 🎉`

**Examples**:

- Felicitări! Ai terminat "Introducere și orientare" 🎉
- Felicitări! Ai finalizat "Monitorizează și solicită" 🎉
- Bravo! Ai completat "Bazele bugetului local" 🎉

---

### Re-engagement (Inactive 7+ Days)

**Template**: `Te așteptăm înapoi la {entityName}`

**Examples**:

- Te așteptăm înapoi la București
- Ne-am uitat și ți-am salvat progresul la Cluj
- Hai să continuim împreună la Timișoara

---

### All Challenges Completed

**Template**: `Ai stăpânit bugetul local din {entityName}. Ce urmează?`

**Examples**:

- Ai stăpânit bugetul local din București. Ce urmează?
- Felicitări! Ai explorat tot conținutul din Cluj
- Ești expert în buget local în Timișoara. Descoperă mai mult!

---

## Email Body Copy

### Greetings

| Scenario  | Romanian                                                                                         | English Meaning                                           |
| --------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Start     | Bun venit, {userName}! 🎉 Ești gata să descoperi cum funcționează bugetul local în {entityName}? | Welcome! Ready to discover how local budget works?        |
| Continue  | Hei, {userName}! 👋 Te așteptăm să termini pasul la care ai rămas.                               | Hey! We're waiting for you to finish where you left off   |
| Celebrate | Bravo, {userName}! 🎉 Ai făcut progrese excelente săptămâna aceasta.                             | Congrats! You made excellent progress this week           |
| Reengage  | Ne-am uitat, {userName}, și ți-am salvat tot progresul. Hai să continuăm împreună!               | We checked and saved all your progress. Let's continue!   |
| Completed | {userName}, ești un expert în buget local! Ai explorat toate provocările pentru {entityName}.    | You're a local budget expert! You explored all challenges |

---

### Progress Summary Section

**Header**:

```
Progresul tău săptămânal
```

**Bullet Points**:

```
✅ {count} pași finalizați
📚 {count} pași total
⏱️ {minutes} minute de învățare
📊 {percentage}% completat
```

**Examples**:

```
✅ 3 pași finalizați
📚 12 pași total
⏱️ 18 minute de învățare
📊 25% completat
```

---

### Call-to-Action Buttons

| Type      | Romanian              | English           |
| --------- | --------------------- | ----------------- |
| Start     | Începe aici →         | Start here        |
| Continue  | Continuă aici →       | Continue here     |
| Celebrate | Pasul următor →       | Next step         |
| Reengage  | Continuăm împreună →  | Continue together |
| Completed | Explorează mai mult → | Explore more      |

---

### Alternative Options

**Section Header**:

```
Sau explorează:
```

**Links**:

```
• Toate provocările disponibile
• Datele deschise ale {entityName}
• Alte primării din județ
```

---

### Footer

**Standard Footer**:

```
Primești acest email pentru că ești abonat la actualizări pentru {entityName}.

Dezabonare | Preferințe
```

---

## Tone Guidelines

### DO ✓

- Use "tu" form (informal)
- Use active verbs: "Exploră", "Descoperă", "Continuă"
- Be specific about achievements
- Reference entity name frequently
- Use friendly emojis (🎉, 👋, ✅)

### DON'T ✗

- Use "dumneavoastră" (too formal)
- Use passive voice
- Be vague about progress
- Use bureaucratic language
- Be overly enthusiastic (no "WOW!!! AMAZING!!!")

---

## Example Complete Email (Romanian)

**Subject**: Continuă provocarea ta la București

---

**Body**:

Hei, Maria! 👋

Te așteptăm să termini pasul la care ai rămas.

---

## PROGRESUL TĂU SĂPTĂMÂNAL

✅ 2 pași finalizați
⏱️ 12 minute de învățare
📊 8 pași total

---

## URMĂTORUL PAS

Cererea de dezbatere publică

Învață cum și când să soliciti o dezbatere publică pe bugetul local.

⏱️ 10 minute

[Continuă aici →]

---

## SAU EXPLOREAZĂ

• Toate provocările disponibile
• Datele deschise ale București

---

Primești acest email pentru că ești abonat la actualizări pentru București.
Dezabonare | Preferințe

---

## Implementation

These copy templates are available in:

- `/src/features/challenges/utils/weekly-digest.ts`

Functions:

- `getWeeklyDigestSubject(type, entityName, challengeTitle?)`
- `getWeeklyDigestGreeting(type, userName, entityName)`
- `getWeeklyDigestCta(type)`

---

## Testing Checklist

- [ ] Subject lines display correctly in email clients
- [ ] Romanian characters (ș, ț, ă, â, î) render properly
- [ ] Entity names are correctly inserted
- [ ] Tone feels natural to native speakers
- [ ] No broken links or malformed URLs
