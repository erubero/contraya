import React from 'react';
import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';

export default function OrganizeReceiptsAndWarranties() {
  return (
    <GuideLayout
      path="/guides/organize-receipts-and-warranties"
      title="How to Organize Receipts and Warranties"
      description="Stop losing receipts and missing warranty claims. A simple four step system to organize receipts and warranties so the proof is there when something breaks."
    >
      <p>
        Receipts and warranties fail together. The warranty is worthless without the receipt, and the
        receipt is pointless once the warranty has expired. Most households store them apart anyway: receipts
        in a shoebox or an email archive, warranty terms in a manual somewhere, deadlines in nobody's head.
        When a product breaks, the scavenger hunt begins, and it usually ends with paying for a repair that
        should have been free. Organizing the two together fixes this.
      </p>

      <h2>Step 1: Capture at the moment of purchase</h2>
      <p>
        Organization systems die at the collection step, so make collection as small as possible. When you
        buy something with meaningful coverage, photograph the receipt before it leaves your hand or forward
        the email confirmation to wherever your system lives. Thermal paper receipts fade within months, so
        the photo is not a backup of the original; for practical purposes it becomes the original. Our guide
        on <Link to="/guides/store-receipts-digitally">storing receipts digitally</Link> covers getting a
        clean, readable capture.
      </p>

      <h2>Step 2: Connect each receipt to its warranty</h2>
      <p>
        This is the step most systems miss. A folder of five hundred receipt photos is barely better than
        the shoebox, because the receipt you need is still buried. Instead, attach each receipt to a record
        of the product it proves: product name, brand, store, purchase date, coverage length, and expiry
        date. When the dishwasher starts leaking, you look up the dishwasher, and everything you need for the
        claim is in one place.
      </p>

      <h2>Step 3: Sort by category, not by date</h2>
      <p>
        When something breaks you think "kitchen appliance", not "March of last year", so group products the
        way you would search for them:
      </p>
      <ul>
        <li>Electronics: phones, laptops, TVs, headphones</li>
        <li>Appliances: kitchen and laundry machines</li>
        <li>Furniture and home</li>
        <li>Tools and outdoor equipment</li>
        <li>Automotive</li>
        <li>Sports gear, jewelry, and everything else</li>
      </ul>
      <p>
        Within a category, the active warranties matter most, so keep expired coverage out of sight or
        archived.
      </p>

      <h2>Step 4: Decide what to keep and what to toss</h2>
      <p>Not every receipt deserves a place in the system. Keep proof of purchase for:</p>
      <ul>
        <li>Anything still under warranty, obviously</li>
        <li>Products inside a return or price adjustment window</li>
        <li>Big ticket items you may insure or resell, where proof of value helps</li>
        <li>Purchases you may need for taxes or expense claims</li>
      </ul>
      <p>
        Groceries and small consumables can go. For the paper originals of major purchases, keep them if the
        retailer or manufacturer asks for originals, but treat the digital copy as your working record. A
        once-a-year sweep to archive expired warranties keeps the whole system light.
      </p>

      <h2>Paper systems, spreadsheets, and apps</h2>
      <p>
        An accordion folder with category tabs works if you are consistent, but it cannot remind you of
        anything and it is only in one place. A spreadsheet adds searchability and can link to receipt
        photos, but the deadlines still depend on you checking it. A dedicated warranty and receipt tracker
        does all four steps in one motion: you snap the receipt, the details are read and filed with the
        photo attached, and the expiry reminders come to you. That last part matters most, because
        remembering deadlines is exactly what humans are bad at; see{' '}
        <Link to="/guides/track-warranty-expiration-dates">how to track warranty expiration dates</Link>.
      </p>

      <h2>The payoff</h2>
      <p>
        An organized system turns a breakdown from an hour of frantic drawer digging into a thirty second
        lookup. More importantly, it converts warranties from money you already spent into money you can
        actually get back. If you want the full picture of what to record for each product, start with{' '}
        <Link to="/guides/track-product-warranties">how to keep track of product warranties</Link>.
      </p>
    </GuideLayout>
  );
}
