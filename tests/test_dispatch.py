import pytest
from cyber_trade_guild_hall.models import (
    GuildMemberCandidate,
    LaborRequisition,
    DispatchReferralSlip,
)
from cyber_trade_guild_hall.engine import GuildDispatchHall


def test_fifo_dispatch_seniority():
    hall = GuildDispatchHall()

    cand1 = GuildMemberCandidate(
        trade_id="CTP-APP-001",
        name="Candidate 1",
        tier="Tier 2 Apprentice",
        assigned_jatc_local="LOCAL-101",
        is_seeking_placement=True,
        days_seeking_placement=15,
        dispatch_book="Book 1 (Resident)",
    )
    cand2 = GuildMemberCandidate(
        trade_id="CTP-APP-002",
        name="Candidate 2",
        tier="Tier 2 Apprentice",
        assigned_jatc_local="LOCAL-101",
        is_seeking_placement=True,
        days_seeking_placement=42,  # Waiting longer -> FIFO top
        dispatch_book="Book 1 (Resident)",
    )
    cand3 = GuildMemberCandidate(
        trade_id="CTP-APP-003",
        name="Candidate 3",
        tier="Tier 2 Apprentice",
        assigned_jatc_local="LOCAL-101",
        is_seeking_placement=False,  # Already placed
        days_seeking_placement=0,
    )

    hall.register_member(cand1)
    hall.register_member(cand2)
    hall.register_member(cand3)

    queue = hall.get_out_of_work_queue(local_id="LOCAL-101", tier="Tier 2 Apprentice")
    assert len(queue) == 2
    assert queue[0].trade_id == "CTP-APP-002"
    assert queue[0].is_queue_aging_alert is True
    assert queue[1].trade_id == "CTP-APP-001"
    assert queue[1].is_queue_aging_alert is False


def test_dispatch_officer_intermediary_workflow():
    hall = GuildDispatchHall()

    cand = GuildMemberCandidate(
        trade_id="CTP-JRN-2026-0001",
        name="Elena Rostova",
        tier="Licensed Journeyman",
        assigned_jatc_local="LOCAL-101",
        is_seeking_placement=True,
        days_seeking_placement=34,
        dispatch_book="Book 1 (Resident)",
    )
    hall.register_member(cand)

    req = LaborRequisition(
        requisition_id="REQ-2026-9001",
        employer_pec_id="PEC-EMP-2026-0001",
        employer_name="Apex Defense Systems",
        local_id="LOCAL-101",
        required_tier="Licensed Journeyman",
        date_submitted="2026-09-01",
    )
    hall.submit_requisition(req)

    req_obj, candidates, alerts = hall.evaluate_requisition_for_officer("REQ-2026-9001")
    assert req_obj is not None
    assert len(candidates) == 1
    assert candidates[0].trade_id == "CTP-JRN-2026-0001"
    assert any("QUEUE AGING ALERT" in a for a in alerts)

    slip = hall.officer_execute_referral(
        requisition_id="REQ-2026-9001",
        candidate_trade_id="CTP-JRN-2026-0001",
        dispatching_officer_id="OFFICER-LOCAL-101",
        referral_notes="Verified qualifications and dispatch seniority."
    )

    assert slip.candidate_trade_id == "CTP-JRN-2026-0001"
    assert slip.wage_step_percentage == 100
    assert slip.dispatching_officer_id == "OFFICER-LOCAL-101"

    updated_req = hall.get_requisition("REQ-2026-9001")
    assert updated_req.status == "REFERRED"
    assert updated_req.dispatched_trade_id == "CTP-JRN-2026-0001"

    placed_cand = hall.get_member("CTP-JRN-2026-0001")
    assert placed_cand.is_seeking_placement is False
    assert placed_cand.days_seeking_placement == 0


def test_mor_requisition_and_modality_routing():
    hall = GuildDispatchHall()

    mor = GuildMemberCandidate(
        trade_id="CTP-MST-009",
        name="Marcus Vance",
        tier="Master Practitioner",
        assigned_jatc_local="LOCAL-101",
        is_seeking_placement=True,
        days_seeking_placement=18,
        seeking_mor_role=True,
        mor_availability="Fractional MoR (vMoR)",
        work_modality_preference="Remote Only",
    )
    hall.register_member(mor)

    req = LaborRequisition(
        requisition_id="REQ-MOR-01",
        employer_pec_id="PEC-EMP-001",
        employer_name="Startup Security Labs",
        local_id="LOCAL-101",
        required_tier="Master Practitioner",
        requires_mor=True,
        mor_engagement_type="Fractional MoR (vMoR)",
        work_modality="Remote Only",
        date_submitted="2026-09-02",
    )
    hall.submit_requisition(req)

    req_obj, queue, alerts = hall.evaluate_requisition_for_officer("REQ-MOR-01")
    assert len(queue) == 1
    assert queue[0].trade_id == "CTP-MST-009"

    slip = hall.officer_execute_referral(
        requisition_id="REQ-MOR-01",
        candidate_trade_id="CTP-MST-009",
        dispatching_officer_id="OFFICER-JATC-VMoR",
    )
    assert slip.is_mor_designation is True
    assert slip.wage_step_percentage == 135
