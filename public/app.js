/**
 * Cybersecurity Craft Guild (CCG) Dispatch Hall Client Engine
 */

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

class GuildHallApp {
  constructor() {
    this.members = [];
    this.requisitions = [];
    this.referralSlips = [];
    this.selectedRequisition = null;
  }

  async init() {
    this.bindNavigation();
    await this.loadData();
  }

  bindNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", e => {
        e.preventDefault();
        const tab = item.getAttribute("data-tab");
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

    const nav = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const pane = document.getElementById(`tab-${tabId}`);
    if (nav) nav.classList.add("active");
    if (pane) pane.classList.add("active");

    const titles = {
      "dispatch-queue": ["Out-of-Work Registers & FIFO Dispatch Hall", "Pillar VI: Neutral bilateral hiring queue enforcing FIFO chronological seniority without recruiter bypass."],
      "regional-districts": ["Regional District Hubs & MSA Wage Schedules", "Pillar II & Pillar VI: Five permanent Regional District Hubs establishing statutory RJPB wage floors and MSA differentials."],
      "requisitions": ["PEC Employer Labor Requisitions", "Formal labor demands submitted by Participating Employer Council organizations."],
      "referral-workbench": ["Guild Dispatch Officer Referral Desk", "Neutral verification matching qualifying FIFO candidates to active employer requisitions."],
      "referral-history": ["Bilateral Dispatch Referral Slips", "Tamper-evident referral orders issued to PEC employers."],
      "training-pipeline": ["JATC Training & Labor Shortage Index (PLSI)", "Pillar I & Pillar VI: Trailing 4-quarter empirical evaluation separating modular continuing education from registered apprentice core curriculum governance."]
    };

    if (titles[tabId]) {
      document.getElementById("current-tab-title").textContent = titles[tabId][0];
      document.getElementById("current-tab-desc").textContent = titles[tabId][1];
    }

    if (tabId === "referral-workbench") {
      this.ensureWorkbenchSelection();
    }
  }

  async loadData() {
    try {
      const res = await fetch("data/mock_guild_data.json");
      const data = await res.json();
      
      this.locals = data.locals || [];

      this.members = (data.practitioners || []).map(p => ({
        trade_id: p.trade_id,
        name: p.name,
        tier: p.tier,
        license_status: p.license_status || "Active",
        total_verified_hours: p.total_verified_hours || 0,
        active_endorsements: p.active_endorsements || [],
        assigned_jatc_local: p.assigned_jatc_local || "LOCAL-101",
        work_modality_preference: p.work_modality_preference || "Any Modality",
        relocation_willingness: p.relocation_willingness || "Resident Local Only",
        security_clearance: p.security_clearance || "Public Trust / Commercial Unclassified",
        is_seeking_placement: p.is_seeking_placement ?? true,
        days_seeking_placement: p.days_seeking_placement ?? Math.floor(Math.random() * 45),
        dispatch_book: p.dispatch_book || "Book 1 (Resident)",
        seeking_mor_role: p.seeking_mor_role ?? false,
        mor_availability: p.mor_availability || "Not Seeking MoR"
      }));

      this.members.sort((a, b) => b.days_seeking_placement - a.days_seeking_placement);

      this.requisitions = (data.labor_requisitions || []).map(r => ({
        requisition_id: r.requisition_id,
        employer_pec_id: r.employer_pec_id,
        employer_name: r.employer_name,
        local_id: r.local_id || r.target_local_id || "LOCAL-101",
        required_tier: r.required_tier,
        required_endorsement: r.required_endorsement && r.required_endorsement !== "ANY" ? r.required_endorsement : null,
        work_modality: r.work_modality || "Any Modality",
        clearance_required: r.clearance_required || r.requires_clearance || "Public Trust / Commercial Unclassified",
        date_submitted: r.date_submitted || "2026-09-01",
        status: r.status === "PENDING_REVIEW" ? "PENDING" : (r.status || "PENDING"),
        requires_mor: r.requires_mor ?? false
      }));

      this.referralSlips = data.referral_slips || [];
      this.renderAll();
    } catch (err) {
      console.error("Failed to load guild mock data:", err);
    }
  }

  renderAll() {
    this.renderLocals();
    this.renderQueue();
    this.renderRequisitions();
    this.renderWorkbenchSelect();
    this.renderReferralSlips();
    this.updateBadges();
  }
  renderLocals() {
    const grid = document.getElementById("locals-card-grid");
    if (!grid) return;
    grid.innerHTML = "";

    (this.locals || []).forEach(loc => {
      const card = document.createElement("div");
      card.style.background = "var(--bg-secondary)";
      card.style.border = "1px solid var(--border-color)";
      card.style.borderRadius = "var(--radius-md)";
      card.style.padding = "1.1rem";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";

      const title = document.createElement("div");
      title.style.fontWeight = "700";
      title.style.fontSize = "14px";
      title.style.color = "#fff";
      title.style.marginBottom = "4px";
      title.style.display = "flex";
      title.style.justifyContent = "space-between";
      title.style.alignItems = "center";
      title.innerHTML = `<span>${escapeHTML(loc.name)}</span><span class="badge badge-primary">${escapeHTML(loc.local_id)}</span>`;

      const territory = document.createElement("div");
      territory.style.fontSize = "11px";
      territory.style.color = "var(--text-secondary)";
      territory.style.marginBottom = "10px";
      territory.style.lineHeight = "1.4";
      territory.textContent = loc.jurisdiction_territory;

      const zoneSchedule = document.createElement("div");
      zoneSchedule.style.background = "rgba(0,0,0,0.25)";
      zoneSchedule.style.border = "1px solid rgba(255,255,255,0.06)";
      zoneSchedule.style.borderRadius = "var(--radius-sm)";
      zoneSchedule.style.padding = "10px 12px";
      zoneSchedule.style.fontSize = "11.5px";
      zoneSchedule.style.marginBottom = "10px";
      zoneSchedule.style.lineHeight = "1.55";
      zoneSchedule.innerHTML = `
        <div style="font-weight:700; color:var(--text-primary); margin-bottom:6px; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px;">
          Local MSA Zone Wage Schedule:
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px; gap:8px;">
          <span style="color:var(--text-secondary);">&bull; Zone 1 (Metro Core - ${escapeHTML(loc.zone_1_examples)}):</span>
          <span style="color:var(--accent-emerald); font-weight:700; font-family:var(--font-mono);">$${loc.zone_1_rate.toFixed(2)}/hr</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px; gap:8px;">
          <span style="color:var(--text-secondary);">&bull; Zone 2 (Secondary Metro - ${escapeHTML(loc.zone_2_examples)}):</span>
          <span style="color:var(--accent-cyan); font-weight:700; font-family:var(--font-mono);">$${loc.zone_2_rate.toFixed(2)}/hr</span>
        </div>
        <div style="display:flex; justify-content:space-between; gap:8px;">
          <span style="color:var(--text-secondary);">&bull; Zone 3 (Non-Metro / Rural Floor):</span>
          <span style="color:#fff; font-weight:700; font-family:var(--font-mono);">$${loc.zone_3_rate.toFixed(2)}/hr Floor</span>
        </div>
      `;

      const metaRow = document.createElement("div");
      metaRow.style.display = "flex";
      metaRow.style.justifyContent = "space-between";
      metaRow.style.alignItems = "center";
      metaRow.style.fontSize = "11px";
      metaRow.style.paddingTop = "8px";
      metaRow.style.borderTop = "1px solid rgba(255,255,255,0.05)";
      metaRow.innerHTML = `
        <span style="color:var(--accent-cyan); font-weight:600;">Active Trade Staffing:</span>
        <span style="color:#fff; font-family:var(--font-mono); font-weight:600;">
          ${loc.active_master_count || 0} Masters &bull; ${loc.active_journeyman_count || 0} Journeymen &bull; ${loc.active_apprentice_count || 0} Apprentices
        </span>
      `;

      card.appendChild(title);
      card.appendChild(territory);
      card.appendChild(zoneSchedule);
      card.appendChild(metaRow);
      grid.appendChild(card);
    });
  }

  renderQueue() {
    const tbody = document.getElementById("queue-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const localFilter = document.getElementById("filter-local")?.value || "ALL";
    const bookFilter = document.getElementById("filter-book")?.value || "ALL";
    const tierFilter = document.getElementById("filter-tier")?.value || "ALL";
    const modFilter = document.getElementById("filter-modality")?.value || "ALL";

    const filtered = this.members.filter(m => {
      if (!m.is_seeking_placement) return false;
      if (localFilter !== "ALL" && m.assigned_jatc_local !== localFilter) return false;
      if (bookFilter !== "ALL" && m.dispatch_book !== bookFilter) return false;
      if (tierFilter !== "ALL" && !m.tier.toLowerCase().includes(tierFilter.toLowerCase())) return false;
      if (modFilter !== "ALL" && m.work_modality_preference !== "Any Modality" && !m.work_modality_preference.includes(modFilter)) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">No candidates currently active matching selected filters.</td></tr>`;
      return;
    }

    filtered.forEach((m, idx) => {
      const tr = document.createElement("tr");
      const agingAlert = m.days_seeking_placement >= 30;
      const rankBadge = idx === 0 
        ? `<span class="badge badge-active" style="background:#10b981; color:#fff;">#1 TOP</span>` 
        : `#${idx + 1}`;

      const endorsements = m.active_endorsements.map(e => `<span class="badge badge-subtle" style="font-size:10px; margin-right:4px;">${escapeHTML(e)}</span>`).join("");

      const modalityShort = m.work_modality_preference.replace(" Only", "");
      let clearanceBadge = "";
      if (m.security_clearance.includes("TS/SCI")) {
        clearanceBadge = `<br><span class="badge" style="background:rgba(239,68,68,0.2); color:#ef4444; font-size:9.5px; padding:1px 4px; font-weight:600;">TS/SCI</span>`;
      } else if (m.security_clearance.includes("Secret")) {
        clearanceBadge = `<br><span class="badge" style="background:rgba(245,158,11,0.2); color:#f59e0b; font-size:9.5px; padding:1px 4px; font-weight:600;">Secret</span>`;
      }

      tr.innerHTML = `
        <td class="col-rank" data-label="FIFO Rank" style="font-weight:700;">${rankBadge}</td>
        <td class="col-practitioner" data-label="Practitioner">
          <strong>${escapeHTML(m.name)}</strong><br>
          <span style="font-size:10.5px; font-family:monospace; color:var(--text-muted);">${escapeHTML(m.trade_id)}</span>
        </td>
        <td class="col-tier" data-label="License Tier">
          <span class="badge badge-primary" style="font-size:10.5px; padding:0.15rem 0.4rem;">${escapeHTML(m.tier)}</span>
          <div style="margin-top:3px; display:flex; flex-wrap:wrap; gap:2px;">${endorsements}</div>
        </td>
        <td class="col-local" data-label="Assigned Local">
          <span class="badge badge-subtle" style="font-size:10.5px;">${escapeHTML(m.assigned_jatc_local)}</span>
        </td>
        <td class="col-book" data-label="Dispatch Book">
          <span class="badge badge-subtle" style="font-size:10.5px;">${escapeHTML(m.dispatch_book)}</span>
        </td>
        <td class="col-queue-days" data-label="Days on Queue">
          <strong style="${agingAlert ? 'color:#ef4444;' : ''}">${m.days_seeking_placement} days</strong>
          ${agingAlert ? '<br><span class="badge" style="background:rgba(239,68,68,0.2); color:#ef4444; font-size:9px; padding:1px 4px;">AGING &gt;= 30d</span>' : ''}
        </td>
        <td class="col-modality" data-label="Modality">
          <span class="badge badge-subtle" style="font-size:10.5px; font-weight:600;">${escapeHTML(modalityShort)}</span>
          ${clearanceBadge}
        </td>
        <td class="col-hours" data-label="Verified Hours" style="font-family:monospace; font-size:11px;">${m.total_verified_hours.toLocaleString()} h</td>
        <td class="col-action" data-label="Action">
          <button class="btn btn-secondary btn-sm" style="padding:0.25rem 0.55rem; font-size:11px;" onclick="window.app.quickDispatch('${escapeHTML(m.trade_id)}')">Match</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  filterQueue() {
    this.renderQueue();
  }


  updateBadges() {
    const queueCount = this.members.filter(m => m.is_seeking_placement).length;
    const reqCount = this.requisitions.filter(r => r.status === "PENDING").length;
    const localsCount = (this.locals || []).length || 5;
    const badgeQueue = document.getElementById("badge-queue-count");
    const badgeReq = document.getElementById("badge-req-count");
    const badgeSlip = document.getElementById("badge-slip-count");
    const badgeLocals = document.getElementById("badge-locals-count");

    if (badgeQueue) badgeQueue.textContent = queueCount;
    if (badgeReq) badgeReq.textContent = reqCount;
    if (badgeSlip) badgeSlip.textContent = this.referralSlips.length;
    if (badgeLocals) badgeLocals.textContent = localsCount;
  }

  renderRequisitions() {
    const tbody = document.getElementById("requisitions-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (this.requisitions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No labor requisitions on file.</td></tr>`;
      return;
    }

    this.requisitions.forEach(r => {
      const tr = document.createElement("tr");
      const statusClass = r.status === "PENDING" ? "badge-active" : (r.status === "REFERRED" ? "badge-success" : "badge-subtle");

      let plsiBadge = "";
      if (r.required_endorsement === "SE-CLD") {
        plsiBadge = `<span class="badge" style="background:rgba(245,158,11,0.2); color:#f59e0b; font-size:9.5px; padding:1px 4px; font-weight:600; margin-left:4px;">PLSI 25% Deficit</span>`;
      } else if (r.required_endorsement === "SE-ICS") {
        plsiBadge = `<span class="badge" style="background:rgba(245,158,11,0.2); color:#f59e0b; font-size:9.5px; padding:1px 4px; font-weight:600; margin-left:4px;">PLSI 20% Deficit</span>`;
      }

      tr.innerHTML = `
        <td data-label="Requisition ID" style="font-family:monospace; font-weight:700;">${escapeHTML(r.requisition_id)}</td>
        <td data-label="Employer">
          <strong>${escapeHTML(r.employer_name)}</strong><br>
          <span style="font-size:11px; font-family:monospace; color:var(--text-muted);">${escapeHTML(r.employer_pec_id)}</span>
        </td>
        <td data-label="Target Local">${escapeHTML(r.local_id)}</td>
        <td data-label="Required Tier">
          <span class="badge badge-primary">${escapeHTML(r.required_tier)}</span>
          ${r.required_endorsement && r.required_endorsement !== 'None' ? `<span class="badge badge-subtle" style="font-size:10px; margin-left:4px;">${escapeHTML(r.required_endorsement)}</span>` : ''}
          ${plsiBadge}
        </td>
        <td data-label="Modality &amp; Clearance">
          <span style="font-size:11px;">${escapeHTML(r.work_modality)}</span><br>
          <span style="font-size:10px; color:var(--text-muted);">${escapeHTML(r.clearance_required)}</span>
        </td>
        <td data-label="Status"><span class="badge ${statusClass}">${escapeHTML(r.status)}</span></td>
        <td data-label="Action">
          ${r.status === "PENDING" 
            ? `<button class="btn btn-primary btn-sm" onclick="window.app.startDispatchWorkbench('${escapeHTML(r.requisition_id)}')">Evaluate Queue</button>`
            : `<span style="font-size:11px; color:var(--text-muted);">Assigned to ${escapeHTML(r.dispatched_trade_id || 'Worker')}</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderWorkbenchSelect() {
    const select = document.getElementById("workbench-requisition-select");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Choose Requisition to Evaluate --</option>';
    this.requisitions.filter(r => r.status === "PENDING").forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.requisition_id;
      opt.textContent = `${r.requisition_id} - ${r.employer_name} (${r.required_tier})`;
      select.appendChild(opt);
    });
    if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  }

  ensureWorkbenchSelection() {
    const select = document.getElementById("workbench-requisition-select");
    if (select && !select.value && select.options.length > 1) {
      select.selectedIndex = 1;
      this.loadWorkbenchRequisition();
    }
  }

  startDispatchWorkbench(reqId) {
    this.switchTab("referral-workbench");
    const select = document.getElementById("workbench-requisition-select");
    if (select) {
      select.value = reqId;
      this.loadWorkbenchRequisition();
    }
  }

  loadWorkbenchRequisition() {
    const select = document.getElementById("workbench-requisition-select");
    const reqId = select?.value;
    const details = document.getElementById("workbench-req-details");
    const list = document.getElementById("workbench-candidates-list");
    const alerts = document.getElementById("workbench-alerts");

    if (!reqId) {
      if (details) details.style.display = "none";
      if (list) list.innerHTML = '<p class="text-muted">Select a requisition on the left to evaluate matching candidates.</p>';
      if (alerts) alerts.style.display = "none";
      return;
    }

    const req = this.requisitions.find(r => r.requisition_id === reqId);
    if (!req) return;

    if (details) {
      details.style.display = "block";
      details.innerHTML = `
        <h5 style="margin-bottom:6px; color:var(--accent-cyan);">${escapeHTML(req.employer_name)}</h5>
        <div style="font-size:12px; line-height:1.6;">
          <strong>ID:</strong> ${escapeHTML(req.requisition_id)}<br>
          <strong>PEC ID:</strong> ${escapeHTML(req.employer_pec_id)}<br>
          <strong>Local:</strong> ${escapeHTML(req.local_id)}<br>
          <strong>Required Tier:</strong> ${escapeHTML(req.required_tier)}<br>
          <strong>Endorsement:</strong> ${escapeHTML(req.required_endorsement || 'None')}<br>
          <strong>Modality:</strong> ${escapeHTML(req.work_modality)} | <strong>Clearance:</strong> ${escapeHTML(req.clearance_required)}<br>
          <strong>Submitted:</strong> ${escapeHTML(req.date_submitted)}
        </div>
      `;
    }

    const matching = this.members.filter(m => {
      if (!m.is_seeking_placement) return false;
      if (req.local_id && req.local_id !== "ALL" && m.assigned_jatc_local !== req.local_id && m.relocation_willingness !== "National / Willing to Relocate") return false;
      if (!m.tier.toLowerCase().includes(req.required_tier.toLowerCase()) && !req.required_tier.toLowerCase().includes(m.tier.toLowerCase())) return false;
      if (req.required_endorsement && req.required_endorsement !== "None" && !m.active_endorsements.includes(req.required_endorsement)) return false;
      return true;
    });

    const aging = matching.filter(m => m.days_seeking_placement >= 30);
    if (alerts) {
      if (aging.length > 0) {
        alerts.style.display = "block";
        alerts.innerHTML = `<strong>QUEUE AGING ALERT:</strong> ${aging.length} candidate(s) waiting 30+ days. FIFO dispatch officer intervention required.`;
      } else {
        alerts.style.display = "none";
      }
    }

    if (list) {
      if (matching.length === 0) {
        list.innerHTML = `<div style="padding:16px; background:rgba(0,0,0,0.2); border-radius:6px; color:var(--text-muted);">ZERO MATCHES: No candidates currently active on out-of-work list matching tier and endorsement requirements.</div>`;
        return;
      }

      list.innerHTML = "";
      matching.forEach((m, idx) => {
        const item = document.createElement("div");
        item.style.cssText = "padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;";
        item.innerHTML = `
          <div>
            <span class="badge ${idx === 0 ? 'badge-active' : 'badge-subtle'}" style="${idx === 0 ? 'background:#10b981; color:#fff;' : ''}">FIFO #${idx + 1}</span>
            <strong style="margin-left:6px;">${escapeHTML(m.name)}</strong> (${escapeHTML(m.trade_id)})<br>
            <span style="font-size:11px; color:var(--text-secondary);">${escapeHTML(m.tier)} | ${m.days_seeking_placement} days on queue | ${escapeHTML(m.dispatch_book)}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.app.executeReferral('${escapeHTML(req.requisition_id)}', '${escapeHTML(m.trade_id)}')">Issue Referral Slip</button>
        `;
        list.appendChild(item);
      });
    }
  }

  executeReferral(reqId, tradeId) {
    const req = this.requisitions.find(r => r.requisition_id === reqId);
    const cand = this.members.find(m => m.trade_id === tradeId);
    if (!req || !cand) return;

    let wagePct = 100;
    const tl = cand.tier.toLowerCase();
    if (tl.includes("tier 1")) wagePct = 50;
    else if (tl.includes("tier 2")) wagePct = 60;
    else if (tl.includes("tier 3")) wagePct = 70;
    else if (tl.includes("tier 4")) wagePct = 80;
    else if (tl.includes("master")) wagePct = 135;

    const slip = {
      referral_id: `REF-${req.requisition_id}-${cand.trade_id}`,
      requisition_id: req.requisition_id,
      employer_pec_id: req.employer_pec_id,
      candidate_trade_id: cand.trade_id,
      candidate_name: cand.name,
      tier: cand.tier,
      wage_step_percentage: wagePct,
      dispatching_officer_id: "OFFICER-DISPATCH-CCG",
      referral_date: "2026-09-03",
      status: "ISSUED"
    };

    this.referralSlips.push(slip);

    cand.is_seeking_placement = false;
    cand.days_seeking_placement = 0;

    req.status = "REFERRED";
    req.dispatched_trade_id = cand.trade_id;

    this.renderAll();
    this.switchTab("referral-history");
  }

  renderReferralSlips() {
    const tbody = document.getElementById("slips-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (this.referralSlips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">No referral slips issued yet this session.</td></tr>`;
      return;
    }

    this.referralSlips.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Referral ID" style="font-family:monospace; font-weight:700;">${escapeHTML(s.referral_id)}</td>
        <td data-label="Requisition" style="font-family:monospace;">${escapeHTML(s.requisition_id)}</td>
        <td data-label="Employer">${escapeHTML(s.employer_pec_id)}</td>
        <td data-label="Worker"><strong>${escapeHTML(s.candidate_name)}</strong><br><span style="font-size:10px; font-family:monospace; color:var(--text-muted);">${escapeHTML(s.candidate_trade_id)}</span></td>
        <td data-label="Tier"><span class="badge badge-primary">${escapeHTML(s.tier)}</span></td>
        <td data-label="Wage Step"><strong>${s.wage_step_percentage}% RJPB</strong></td>
        <td data-label="Dispatch Officer">${escapeHTML(s.dispatching_officer_id)}</td>
        <td data-label="Date">${escapeHTML(s.referral_date)}</td>
        <td data-label="Status"><span class="badge badge-active">${escapeHTML(s.status)}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  openRequisitionModal() {
    const modal = document.getElementById("modal-requisition");
    if (modal) modal.style.display = "flex";

    const endSelect = document.getElementById("modal-endorsement");
    if (endSelect && !endSelect.dataset.listenerBound) {
      endSelect.dataset.listenerBound = "true";
      endSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        const advisory = document.getElementById("modal-plsi-advisory");
        const textSpan = document.getElementById("modal-plsi-advisory-text");
        if (!advisory) return;

        if (val === "SE-CLD") {
          advisory.style.display = "block";
          if (textSpan) textSpan.textContent = "SE-CLD is classified as a Persistent Structural Deficit (PLSI 25.0% >= 20%). Accelerated traveler referral (Book 2/Book 3) and Supervised Specialty Trainee dispatch under an active Master of Record are authorized.";
        } else if (val === "SE-ICS") {
          advisory.style.display = "block";
          if (textSpan) textSpan.textContent = "SE-ICS is classified as a Persistent Structural Deficit (PLSI 20.0% >= 20%). Multi-district traveler referral and Supervised Specialty Trainee dispatch under an active Master of Record are authorized.";
        } else if (val === "SE-MED") {
          advisory.style.display = "block";
          if (textSpan) textSpan.textContent = "SE-MED is classified as a Persistent Structural Deficit (PLSI 22.5% >= 20%). Accelerated cross-jurisdictional traveler referral and FDA 524B supervised bridge training are authorized.";
        } else {
          advisory.style.display = "none";
        }
      });
    }
  }

  closeRequisitionModal() {
    const modal = document.getElementById("modal-requisition");
    if (modal) modal.style.display = "none";
  }

  handleRequisitionSubmit(e) {
    e.preventDefault();
    const pecSelect = document.getElementById("modal-pec-id");
    const pecId = pecSelect.value;
    const pecText = pecSelect.options[pecSelect.selectedIndex].text;
    const employerName = pecText.split(":")[1]?.trim() || pecId;

    const newReq = {
      requisition_id: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      employer_pec_id: pecId,
      employer_name: employerName,
      local_id: document.getElementById("modal-local-id").value,
      required_tier: document.getElementById("modal-tier").value,
      required_endorsement: document.getElementById("modal-endorsement").value,
      work_modality: document.getElementById("modal-modality").value,
      clearance_required: "Public Trust / Commercial Unclassified",
      date_submitted: "2026-09-03",
      status: "PENDING",
      requires_mor: false
    };

    this.requisitions.unshift(newReq);
    this.closeRequisitionModal();
    this.renderAll();
    this.switchTab("requisitions");
  }

  quickDispatch(tradeId) {
    this.switchTab("requisitions");
  }

  filterPLSI(category) {
    document.querySelectorAll("[data-plsi-filter]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-plsi-filter") === category);
    });

    const rows = document.querySelectorAll("#plsi-tbody tr");
    rows.forEach(tr => {
      const rowCat = tr.getAttribute("data-plsi-category");
      if (category === "ALL" || rowCat === category) {
        tr.style.display = "";
      } else {
        tr.style.display = "none";
      }
    });
  }

  openLabEnrollModal(labName, hours, localName, endorsementCode) {
    const modal = document.getElementById("modal-lab-enroll");
    if (!modal) return;
    document.getElementById("lab-enroll-name").textContent = labName;
    document.getElementById("lab-enroll-hours").textContent = `${hours} Hours Modular RTI`;
    document.getElementById("lab-enroll-local").textContent = localName;
    document.getElementById("lab-enroll-endorsement").textContent = endorsementCode || "SE-XXXX";
    modal.style.display = "flex";
  }

  closeLabEnrollModal() {
    const modal = document.getElementById("modal-lab-enroll");
    if (modal) modal.style.display = "none";
  }

  confirmLabEnroll() {
    this.closeLabEnrollModal();
    const labName = document.getElementById("lab-enroll-name").textContent;
    alert(`JATC Enrollment Confirmed: Voucher issued for ${labName}. Zero-tuition instruction verified under Taft-Hartley JATC Training Trust.`);
  }

}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new GuildHallApp();
  window.app.init();
});

