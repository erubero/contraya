-- Extraction upgrades from the Contract Assistant brief: the total money the
-- contract involves (only when it states one) and the counterparty's contact
-- details as written in the document.

alter table public.contracts
  add column total_value numeric(12, 2)
    constraint contracts_total_value_range check (total_value is null or total_value >= 0),
  add column party_other_contact text
    constraint contracts_party_other_contact_len check (party_other_contact is null or length(party_other_contact) <= 300);
