# Cybersecurity Craft Guild (CCG) Dispatch Hall & Member Services

The **Guild Dispatch Hall** (`guild-hall`) is the operational labor referral, Out-of-Work queue, and placement management application for **The Cybersecurity Craft Guild (CCG)**.

It operationalizes Pillar VI (Craft Guilds, Labor Trusts & Collective Defense) and executes neutral, non-predatory workforce referral across Participating Employer Council (PEC) organizations.

---

## 1. Core Architecture & Operations

The Guild Dispatch Hall is owned and operated solely by the Cybersecurity Craft Guild. It consumes verified licensure and credential status from the **National Cybersecurity Trade Board (NCTB) Clearinghouse** as its authoritative upstream source of truth, while independently managing:

* **Out-of-Work Registers (Books 1, 2, and 3):**
  * **Book 1 (Resident):** Licensed Journeymen & Registered Apprentices residing within the regional Local JATC jurisdiction.
  * **Book 2 (Regional):** Qualified practitioners from adjacent administrative districts.
  * **Book 3 (National):** National traveler pool and out-of-district practitioners.
* **First-In, First-Out (FIFO) Seniority of Availability:**
  * Candidates waiting longest on the Out-of-Work register are prioritized for requisitions without arbitrary bypass.
  * **Queue Aging Alerts:** Automated notifications triggered when a qualified candidate reaches 30+ days on queue to prompt Dispatch Officer intervention.
* **Bilateral Labor Requisitions & Neutral Referral Slips:**
  * Participating employers submit formal requisitions specifying required tier, endorsements, modality, and clearance.
  * Neutral Guild Dispatch Officers evaluate qualifying FIFO candidates and issue tamper-evident Dispatch Referral Slips.
* **Modality & Mobility Routing:**
  * Supports Remote Only, Hybrid, and On-Site SCIF / Classified roles under the Anti-Wage-Arbitrage Rule.
* **Fractional Master of Record (vMoR) Placement:**
  * Connects small-to-medium businesses (SMBs) with accredited Master Practitioners for fractional statutory oversight.

---

## 2. Institutional Demarcation

* **NCTB Clearinghouse (`clearinghouse`):** Regulatory body maintaining the public register of licenses, verified domain hours, and Form FORM-001/002 filings.
* **CCG Guild Hall (`guild-hall`):** Labor organization managing job placement, out-of-work books, and employer labor requisitions.
