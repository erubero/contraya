import React from 'react';
import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';

export default function TrackProductWarranties() {
  return (
    <GuideLayout
      path="/guides/track-product-warranties"
      title="How to Keep Track of Product Warranties"
      description="A practical system to keep track of product warranties: know your coverage, save proof of purchase, record the dates, and set reminders before coverage ends."
    >
      <p>
        Almost everything you buy comes with a warranty, and most of them expire without ever being used.
        Not because nothing broke, but because when something did, the receipt was gone, the deadline had
        passed, or nobody remembered the coverage existed. Keeping track of product warranties is mostly a
        matter of capturing a few details at purchase time and letting a system remember them for you.
      </p>

      <h2>1. Know which warranties you actually have</h2>
      <p>Most products carry more coverage than people assume. There are usually three layers to check:</p>
      <ul>
        <li>
          <strong>Manufacturer warranty.</strong> Included with the product. Electronics and small appliances
          commonly carry one year; larger appliances and furniture often carry more. The exact terms are in
          the box, in the manual, or on the manufacturer's website.
        </li>
        <li>
          <strong>Store or retailer warranty.</strong> Some retailers add their own coverage or generous
          return windows on top of the manufacturer's.
        </li>
        <li>
          <strong>Extended warranty.</strong> Coverage you bought separately at checkout. It has its own
          terms and its own end date, so track it as its own entry.
        </li>
      </ul>
      <p>
        Some credit cards also extend the manufacturer warranty on purchases made with the card, and some
        regions guarantee a legal minimum coverage period. Check your card benefits and local consumer rules
        so you know what you are entitled to.
      </p>

      <h2>2. Capture proof of purchase immediately</h2>
      <p>
        A warranty claim almost always requires proof of purchase, and the receipt is the weakest link in
        the whole system. Paper receipts fade, and email confirmations get buried. The fix is simple:
        photograph the receipt the day you buy the product, while it is still crisp and you still remember
        what it was for. If the product has a serial number, capture that too, because many manufacturers ask
        for it when you file a claim. Our guide on{' '}
        <Link to="/guides/store-receipts-digitally">storing receipts digitally</Link> covers the best way to
        do this.
      </p>

      <h2>3. Record the two dates that matter</h2>
      <p>Every warranty entry needs exactly two dates:</p>
      <ol>
        <li><strong>The purchase date</strong>, which starts the clock and is printed on the receipt.</li>
        <li>
          <strong>The expiry date</strong>, which is the purchase date plus the coverage length. A laptop
          bought March 10 with a one year warranty is covered through March 10 of next year.
        </li>
      </ol>
      <p>
        If you only know the coverage length, compute the expiry date right away rather than leaving a note
        like "12 months". Future you should never have to do date math during a breakdown. See{' '}
        <Link to="/guides/track-warranty-expiration-dates">how to track warranty expiration dates</Link> for
        the details, including registration requirements and stacked coverage.
      </p>

      <h2>4. Set reminders before the deadline, not on it</h2>
      <p>
        A reminder on the expiry date itself is too late to act. Two reminders work well in practice: one
        30 days before expiry, which leaves time to test the product thoroughly and gather paperwork, and one
        7 days before as a last call. When the first reminder arrives, use the product deliberately for a few
        days. If anything is off, file the claim while the repair is still the manufacturer's problem.
      </p>

      <h2>5. Keep everything in one place</h2>
      <p>
        The system fails when information is scattered: the receipt in a drawer, the purchase date in an
        email, the coverage terms in a manual that went out with the recycling. Pick one home for all of it.
        A spreadsheet works if you are disciplined: one row per product with the purchase date, expiry date,
        store, price, serial number, and a link to the receipt photo. The weakness of a spreadsheet is that
        it never taps you on the shoulder, so pair it with calendar reminders, or use a warranty tracker app
        that does both jobs. It also helps to{' '}
        <Link to="/guides/organize-receipts-and-warranties">organize receipts and warranties together</Link>{' '}
        so the proof is attached to the coverage it belongs to.
      </p>

      <h2>A 30 second habit</h2>
      <p>
        That is the whole system: know the coverage, photograph the receipt, record the dates, get reminded
        early, keep it all in one place. Done at purchase time it takes about half a minute per product, and
        the first successful claim on a phone, an appliance, or a pair of headphones pays the habit back many
        times over.
      </p>
    </GuideLayout>
  );
}
