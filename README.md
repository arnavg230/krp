# KRP Dry Fruits storefront

A small, static storefront ready to deploy on Vercel. No build step or dependencies are needed.

## Before launch

Edit `SHOP` and `PRODUCTS` near the top of `app.js` before accepting enquiries:

- Set the WhatsApp number (digits only, with country code; e.g. `919876543210`), currency, and locale.
- Add product prices and pack sizes if you want to display them. Prices currently say “Price on request.”
- The two almond photos are labeled Selection 1 and Selection 2 until their varieties are confirmed.

The five product photos supplied by the shop are saved in `assets/`. The bag is saved in the shopper's browser. Once a WhatsApp number is set, checkout opens an enquiry message with the selected products; price, pack sizes, delivery, and payment can be confirmed directly with the shop.

## Deploy

Import this folder as a project in Vercel, with the Framework Preset set to **Other** and no build or output command. Vercel serves `index.html` from the project root.
