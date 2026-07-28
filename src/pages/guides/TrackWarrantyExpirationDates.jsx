import React from 'react';
import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';

export default function TrackWarrantyExpirationDates() {
  return (
    <GuideLayout
      path="/guides/track-warranty-expiration-dates"
      title="How to Track Warranty Expiration Dates"
      description="Find the coverage length, compute the expiry date, and set warranty reminders at 30 and 7 days so claims get filed while repairs are still covered."
    >
      <p>
        A warranty has exactly one moment of truth: the day it expires. File a claim the week before and the
        repair is the manufacturer's problem. Notice the fault the week after and it is yours. Tracking
        expiration dates well is what separates warranties that save money from warranties that quietly run
        out.
      </p>

      <h2>Find the real coverage length</h2>
      <p>The coverage length is rarely printed on the receipt. Look for it, in order of reliability:</p>
      <ol>
        <li><strong>The warranty card or manual</strong> in the box, which states the term outright.</li>
        <li><strong>The manufacturer's website</strong>, on the product or support page.</li>
        <li>
          <strong>The retailer's listing</strong>, which usually states the manufacturer term next to any
          extended options.
        </li>
      </ol>
      <p>
        Watch for split terms: some products cover parts and labor for different lengths, and appliances
        sometimes cover a key component, like a compressor or motor, far longer than the rest of the
        machine. Record the shortest meaningful term as your deadline, and note the longer component coverage
        in the record.
      </p>

      <h2>Compute the expiry date once</h2>
      <p>
        Expiry is the purchase date plus the coverage length: a blender bought on July 10 with a two year
        warranty is covered through July 10 two years later. Do this arithmetic when you save the record,
        never during a breakdown. Three details deserve attention:
      </p>
      <ul>
        <li>
          <strong>The clock starts at purchase</strong>, not first use. The gift bought in November for a
          December birthday has been burning warranty since November.
        </li>
        <li>
          <strong>Registration can matter.</strong> Most coverage applies automatically, but some
          manufacturers extend or condition coverage on registering the product. If a registration promotion
          extends the term, update your expiry date after registering.
        </li>
        <li>
          <strong>Extended coverage has its own dates.</strong> Whether an extended warranty starts at
          purchase or when the manufacturer term ends varies by contract, so read the terms and track it as
          its own deadline. Some regions also set a legal minimum coverage period regardless of the
          manufacturer's term; check your local consumer rules.
        </li>
      </ul>

      <h2>Set reminders that leave time to act</h2>
      <p>A single reminder on the expiry date is a notification about money you just lost. Use two:</p>
      <ul>
        <li>
          <strong>30 days before:</strong> the working reminder. Test the product deliberately: run the
          appliance through a full cycle, check the laptop battery and ports, listen to both earbuds. Faults
          found now get fixed on the manufacturer's dime.
        </li>
        <li>
          <strong>7 days before:</strong> the last call. If anything from the 30 day check is unresolved,
          start the claim today, because support queues and paperwork eat days.
        </li>
      </ul>

      <h2>Pick a tool that reminds you</h2>
      <p>
        A calendar works: create an event for each expiry with the two alerts, and keep the proof of purchase
        findable, since the reminder is useless if the receipt is gone; see{' '}
        <Link to="/guides/store-receipts-digitally">how to store receipts digitally</Link>. A spreadsheet
        holds more detail, but it only answers when asked, so it needs the calendar anyway. A warranty
        reminder app folds the whole loop into one place: the record, the receipt photo, the computed expiry
        date, and both reminders, created in the time it takes to photograph the receipt. Whichever tool you
        choose, the full setup for each product is covered in{' '}
        <Link to="/guides/track-product-warranties">how to keep track of product warranties</Link>.
      </p>

      <h2>The pre-expiry test, in one list</h2>
      <ul>
        <li>Use every function you paid for, not just the daily ones.</li>
        <li>Check batteries, hinges, seals, and cables, the parts that fail quietly.</li>
        <li>Listen for new noises on appliances and tools.</li>
        <li>If anything is off, gather the receipt and serial number and file before the date.</li>
      </ul>
      <p>
        Thirty seconds of setup per product, two reminders, one deliberate test. That is the entire
        discipline, and it is worth real money the first time a fridge compressor hesitates in month eleven.
      </p>
    </GuideLayout>
  );
}
