# מדריך הפעלה חיה — מונדיאל פנטזי 2026

## שלב 1 — GitHub

```bash
cd /home/user/workspace/mundial-fantasy
git init
git add .
git commit -m "Mundial Fantasy 2026 - Initial"
# צור repo חדש ב-GitHub ואז:
git remote add origin https://github.com/<שם-משתמש>/mundial-fantasy.git
git push -u origin main
```

---

## שלב 2 — Railway (backend + database)

1. כנס ל-[railway.app](https://railway.app) → **New Project → Deploy from GitHub Repo**
2. בחר את ה-repo שזה עתה העלית
3. Railway יזהה Node.js אוטומטית

### Environment Variables ב-Railway:
```
NODE_ENV=production
PORT=5000
PAYPLUS_API_KEY=<המפתח שלך מ-PayPlus>
PAYPLUS_SECRET=<הסוד שלך מ-PayPlus>
```

### Build & Start Commands:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `NODE_ENV=production node dist/index.cjs`

4. לאחר deploy קבל את ה-URL: לדוגמה `https://mundial-fantasy.up.railway.app`

---

## שלב 3 — הגדרת Admin ראשון

לאחר ש-Railway פועל, הרץ פעם אחת:

```bash
curl -X POST https://mundial-fantasy.up.railway.app/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"בסים נמוז","email":"bnamouz@gmail.com","phone":"050-XXXXXXX","password":"סיסמה-חזקה-שלך"}'
```

קבל את ה-`userId` מהתשובה, ואז עדכן ידנית ב-Railway Database Console:
```sql
UPDATE users SET is_admin = 1 WHERE id = <userId>;
```

---

## שלב 4 — הוספת שחקנים

היכנס לאפליקציה כ-admin → לוח ניהול → "הוסף שחקנים"  
זה יוסיף 30+ שחקני מונדיאל בלחיצה אחת.

---

## שלב 5 — PayPlus (תשלום אמיתי)

### יצירת חשבון PayPlus:
1. כנס ל-[payplus.co.il](https://payplus.co.il) → פתח חשבון עסקי
2. קבל `API Key` + `Secret Key` מהדשבורד

### Webhook — עדכון אוטומטי לאחר תשלום:
1. ב-PayPlus → הגדרות → Webhooks
2. URL: `https://mundial-fantasy.up.railway.app/api/webhooks/payplus`
3. אירועים: `PAYMENT_COMPLETED`

### שינוי checkout URL בקוד:
פתח `server/routes.ts`, שורה ~130, ועדכן:
```js
// החלף את ה-URL הסימולטיבי בקריאת API אמיתית ל-PayPlus:
const paymentUrl = await createPayPlusPayment({
  amount: 300,
  description: "מונדיאל פנטזי 2026",
  more_info: String(user.id),  // מזהה המשתמש לצורך webhook
  successUrl: "https://your-domain.com/#/dashboard",
});
```

### פונקציית PayPlus (הוסף ל-routes.ts):
```js
async function createPayPlusPayment({ amount, description, more_info, successUrl }) {
  const resp = await fetch("https://api.payplus.co.il/api/v1.0/PaymentPages/generateLink", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api_key": process.env.PAYPLUS_API_KEY,
      "secret_key": process.env.PAYPLUS_SECRET,
    },
    body: JSON.stringify({
      payment_page_uid: "",
      charge_default: {
        currency_code: "ILS",
        amount,
      },
      more_info,
      more_info_1: description,
      success_redirect_url: successUrl,
    }),
  });
  const data = await resp.json();
  return data.data.payment_page_link;
}
```

---

## שלב 6 — מערכת פרסים (תהליך בסוף עונה)

### כשהמונדיאל נגמר:
1. היכנס כ-Admin → פאנל ניהול
2. לך ל-API ישירות (או הוסף כפתור בממשק):
```bash
curl -X POST https://your-railway-url/api/prizes/finalize \
  -H "Authorization: Bearer <admin-token>"
```
3. המערכת תחשב אוטומטית:
   - 🥇 מקום 1: 50% מהקופה
   - 🥈 מקום 2: 25%
   - 🥉 מקום 3: 15%
   - 🎖 מקומות 4-10: 10% מחולק שווה
   - 💼 עמלת פלטפורמה: 40% נשאר אצלך

4. כל זוכה יראה בדף "פרסים" שלו את הסכום ויכול להזין פרטי Bit / Paybox / בנק
5. אתה רואה בפאנל ניהול את כל הפרסים + מסמן "שולם" לאחר שהעברת

---

## מבנה חלוקת הכסף (דוגמה עם 100 משתתפים):

| סה"כ נגבה | עמלה (40%) | קופת פרסים (60%) |
|-----------|-----------|-----------------|
| 30,000₪   | 12,000₪   | 18,000₪         |

| מקום | % | סכום |
|------|---|------|
| 🥇 1  | 50% | 12,000₪ |
| 🥈 2  | 25% | 6,000₪  |
| 🥉 3  | 15% | 3,600₪  |
| 🎖 4-10 | 10% / 7 | ~343₪ כל אחד |

---

## ניחושי תוצאות (Bonus Pool)

- משתמשים מנחשים תוצאות משחקים
- ניחוש מדויק = **10 נקודות** לפנטזי
- ניחוש ניצחון נכון = **3 נקודות**
- בונוס כסף = אתה קובע ידנית מהפאנל (לדוגמה: הראשון שניחש נכון מקבל 100₪)

### לסגור תוצאות (אחרי כל משחק):
```bash
curl -X POST https://your-url/api/predictions/resolve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"matchLabel":"BRA vs FRA","actualScore":"2-1"}'
```
