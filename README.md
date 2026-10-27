# Informatika testi (MS Word, Excel, PowerPoint)

Akademik litsey oʻquvchilari uchun interaktiv test. Server kerak emas:
sahifa **GitHub Pages**da ishlaydi, natijalar **Google Sheets**ga yoziladi,
xohlasangiz **Telegram**ga ham xabar keladi.

Toʻgʻri javoblar sahifada **yoʻq**: savollar Apps Script'dan keladi, baholash ham oʻsha yerda bajariladi.

## 1. Google Sheets va Apps Script
1. Yangi Google Sheets jadvali yarating (masalan, «Informatika test natijalari»).
2. **Kengaytmalar → Apps Script** ni oching, `Code.gs` ichidagini oʻchirib, `apps-script/Code.gs` ni toʻliq qoʻying.
   Soʻng **＋ → Script** bilan yana ikkita fayl yarating:
   - `Savollar` — unga `Savollar.gs` ni qoʻying;
   - `Sozlamalar` — unga `Sozlamalar.gs` ni qoʻying (yoʻq boʻlsa, `apps-script/Sozlamalar.example.gs` dan nusxa oling).
   > `Savollar.gs` (savollar va **toʻgʻri javoblar**) va `Sozlamalar.gs` (parol, Telegram tokeni) GitHub'ga yuklanmaydi
   > (`.gitignore`da), faqat Apps Script ichida turadi. Ularni xavfsiz joyda zaxira qilib qoʻying.
3. `Sozlamalar` faylida `PASSWORD` ni oʻrnating. Telegram kerak boʻlsa `TG_TOKEN` va `TG_CHAT_ID` ni toʻldiring.
4. Funksiyalar roʻyxatidan **setup** ni tanlab **Run** bosing va ruxsat bering
   («Advanced → Go to … (unsafe)» – bu sizning oʻz skriptingiz).
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Berilgan `https://script.google.com/macros/s/.../exec` manzilini nusxalang.

> Kodni oʻzgartirsangiz: **Deploy → Manage deployments → ✏️ → Version: New version**. Shunda manzil oʻzgarmaydi.

## 2. GitHub
1. Ushbu fayllarni yangi repoga yuklang (`main` branch).
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   `SCRIPT_URL` = 1-bosqichdagi manzil.
3. **Settings → Pages → Source: GitHub Actions**.
4. **Actions** boʻlimida «Build va GitHub Pages ga joylash» ni ishga tushiring (yoki istalgan push).
5. Test manzili: `https://USERNAME.github.io/REPO/` — shuni oʻquvchilarga bering.

## 3. Natijalar (faqat oʻqituvchi uchun)
- Google Sheets → **Natijalar** varagʻi (jonli yangilanadi). **Fayl → Yuklab olish → Microsoft Excel**.
- Yoki toʻgʻridan-toʻgʻri .xls: `SCRIPT_URL?action=xls&key=PAROL`
- **Urinishlar** varagʻi: kim necha marta boshlagan. Oʻquvchiga qayta imkon berish uchun uning qatorini oʻchiring.
- Yangi guruh uchun ikkala varaqdagi maʼlumotlarni (sarlavhadan tashqari) tozalang.

## Telegram chat ID ni topish
Botga `/start` yozing, soʻng brauzerda `https://api.telegram.org/bot<TOKEN>/getUpdates`
ni oching — `"chat":{"id": ...}` qiymati kerakli ID. Guruhga yuborish uchun botni guruhga qoʻshing.

## Til (oʻzbekcha / ruscha)
Kirish oynasida oʻquvchi tilni tanlaydi — savollar ham, sahifa ham shu tilda chiqadi.
Oʻqituvchi jadvali, .xls va Telegram xabarlari doim oʻzbekcha.

## Savollarni oʻzgartirish
Apps Script'dagi `Savollar` faylini tahrirlang, saqlang va **Deploy → Manage deployments → ✏️ → New version** qiling.
Har bir savolda `ru:{q, o}` — ruscha matn; variantlar tartibi oʻzbekchasi bilan bir xil boʻlishi shart.
Ochiq savollarda ruscha javob boʻlsa, uni ham `a` roʻyxatiga qoʻshing.
Test ketayotganda savollarni oʻchirmang yoki oʻrnini almashtirmang — yangi savolni roʻyxat oxiriga qoʻshing.
Yangi rasm turi kerak boʻlsa, `index.html` dagi `IMG` ga qoʻshiladi.
