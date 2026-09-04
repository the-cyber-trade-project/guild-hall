"""
Cybersecurity Craft Guild (CCG) Dispatch Engine.
Implements FIFO chronological seniority of availability, multi-book routing,
modality/clearance matching, and Dispatch Officer referral workflows.
"""

from typing import Dict, List, Optional, Tuple, Any
from cyber_trade_guild_hall.models import (
    GuildMemberCandidate,
    LaborRequisition,
    DispatchReferralSlip,
    DispatchMatchResult,
)


class GuildDispatchHall:
    """
    Operational dispatch engine managing candidate out-of-work registers,
    employer requisitions, and Dispatch Officer referrals.
    Consumes verified practitioner license standing from NCTB Clearinghouse.
    """

    def __init__(self):
        self._members: Dict[str, GuildMemberCandidate] = {}
        self._requisitions: Dict[str, LaborRequisition] = {}
        self._referral_slips: Dict[str, DispatchReferralSlip] = {}

    def register_member(self, candidate: GuildMemberCandidate) -> None:
        """Adds or updates a member in the Dispatch Hall system."""
        self._members[candidate.trade_id] = candidate

    def get_member(self, trade_id: str) -> Optional[GuildMemberCandidate]:
        return self._members.get(trade_id)

    def list_members(self) -> List[GuildMemberCandidate]:
        return list(self._members.values())

    def submit_requisition(self, requisition: LaborRequisition) -> None:
        """Registers a formal labor requisition from a PEC employer."""
        self._requisitions[requisition.requisition_id] = requisition

    def get_requisition(self, requisition_id: str) -> Optional[LaborRequisition]:
        return self._requisitions.get(requisition_id)

    def list_requisitions(self, status: Optional[str] = None) -> List[LaborRequisition]:
        if status:
            return [r for r in self._requisitions.values() if r.status == status]
        return list(self._requisitions.values())

    def list_referral_slips(self) -> List[DispatchReferralSlip]:
        return list(self._referral_slips.values())

    def get_out_of_work_queue(
        self,
        local_id: Optional[str] = None,
        tier: Optional[str] = None,
        endorsement: Optional[str] = None,
        modality: Optional[str] = None,
        clearance: Optional[str] = None,
        requires_mor: bool = False,
        mor_engagement_type: Optional[str] = None,
        dispatch_book: Optional[str] = None,
    ) -> List[GuildMemberCandidate]:
        """
        Returns active candidates on the Out-of-Work register sorted strictly by
        FIFO chronological seniority of availability (longest days seeking placement first).
        """
        candidates = [m for m in self._members.values() if m.is_seeking_placement]

        if local_id and local_id != "ALL":
            candidates = [
                m for m in candidates
                if m.assigned_jatc_local == local_id or m.relocation_willingness == "National / Willing to Relocate"
            ]

        if dispatch_book and dispatch_book != "ALL":
            candidates = [m for m in candidates if m.dispatch_book == dispatch_book]

        if tier:
            candidates = [m for m in candidates if self._matches_tier(m.tier, tier)]

        if requires_mor:
            candidates = [
                m for m in candidates
                if "master" in m.tier.lower() and m.seeking_mor_role
            ]
            if mor_engagement_type and mor_engagement_type != "Any":
                candidates = [
                    m for m in candidates
                    if mor_engagement_type.lower() in m.mor_availability.lower() or m.mor_availability == "Any"
                ]

        if endorsement and endorsement != "None" and endorsement != "":
            candidates = [m for m in candidates if endorsement in m.active_endorsements]

        if modality and modality != "Any":
            candidates = [
                m for m in candidates
                if m.work_modality_preference == "Any Modality"
                or modality.lower() in m.work_modality_preference.lower()
            ]

        if clearance and clearance != "None":
            candidates = [
                m for m in candidates
                if self._clearance_satisfies(m.security_clearance, clearance)
            ]

        # Strict FIFO Order: Longest days seeking placement first
        candidates.sort(key=lambda x: x.days_seeking_placement, reverse=True)
        return candidates

    def evaluate_requisition_for_officer(
        self,
        requisition_id: str,
        target_local_id: Optional[str] = None
    ) -> Tuple[Optional[LaborRequisition], List[GuildMemberCandidate], List[str]]:
        """
        Evaluates a requisition against the FIFO queue and returns matches along with
        audit alerts (such as queue aging alerts >=30 days or zero-match warnings).
        """
        req = self._requisitions.get(requisition_id)
        if not req:
            return None, [], ["Requisition not found in Guild Hall ledger."]

        effective_local = target_local_id or req.local_id
        queue = self.get_out_of_work_queue(
            local_id=effective_local,
            tier=req.required_tier,
            endorsement=req.required_endorsement,
            modality=req.work_modality,
            clearance=req.clearance_required,
            requires_mor=req.requires_mor,
            mor_engagement_type=req.mor_engagement_type,
        )

        alerts = []
        for cand in queue:
            if cand.is_queue_aging_alert:
                alerts.append(
                    f"QUEUE AGING ALERT: Candidate {cand.trade_id} ({cand.name}) has waited {cand.days_seeking_placement} days on {cand.dispatch_book}."
                )

        if not queue:
            alerts.append("ZERO MATCHES: Requisition exceeds current Out-of-Work inventory; requires regional broadcast.")

        return req, queue, alerts

    def officer_execute_referral(
        self,
        requisition_id: str,
        candidate_trade_id: str,
        dispatching_officer_id: str,
        referral_notes: Optional[str] = None,
    ) -> DispatchReferralSlip:
        """
        Executes formal bilateral referral by the Guild Dispatch Officer.
        Transitions requisition to REFERRED and sets candidate as placed.
        """
        req = self._requisitions.get(requisition_id)
        if not req:
            raise ValueError(f"Requisition {requisition_id} not found.")

        candidate = self._members.get(candidate_trade_id)
        if not candidate:
            raise ValueError(f"Candidate {candidate_trade_id} not found.")

        if not candidate.is_seeking_placement:
            raise ValueError(f"Candidate {candidate_trade_id} is not currently active on the out-of-work list.")

        wage_pct = 100
        tier_l = candidate.tier.lower()
        if "tier 1" in tier_l:
            wage_pct = 50
        elif "tier 2" in tier_l:
            wage_pct = 60
        elif "tier 3" in tier_l:
            wage_pct = 70
        elif "tier 4" in tier_l:
            wage_pct = 80
        elif "master" in tier_l:
            wage_pct = 135

        ref_id = f"REF-{requisition_id}-{candidate_trade_id}"
        slip = DispatchReferralSlip(
            referral_id=ref_id,
            requisition_id=req.requisition_id,
            employer_pec_id=req.employer_pec_id,
            candidate_trade_id=candidate.trade_id,
            candidate_name=candidate.name,
            tier=candidate.tier,
            is_mor_designation=req.requires_mor,
            mor_engagement_type=req.mor_engagement_type if req.requires_mor else None,
            dispatching_officer_id=dispatching_officer_id,
            referral_date="2026-09-03",
            dispatch_book=candidate.dispatch_book,
            days_on_queue=candidate.days_seeking_placement,
            wage_step_percentage=wage_pct,
            status="ISSUED",
        )

        self._referral_slips[ref_id] = slip

        # Update candidate state
        candidate.is_seeking_placement = False
        candidate.days_seeking_placement = 0

        # Update requisition state
        req.status = "REFERRED"
        req.assigned_officer_id = dispatching_officer_id
        req.dispatched_trade_id = candidate.trade_id
        req.referral_notes = referral_notes

        return slip

    @staticmethod
    def _matches_tier(candidate_tier: str, requested_tier: str) -> bool:
        ct = candidate_tier.lower().strip()
        rt = requested_tier.lower().strip()
        if rt == ct:
            return True
        if "tier 1" in rt and "tier 1" in ct:
            return True
        if "tier 2" in rt and "tier 2" in ct:
            return True
        if "tier 3" in rt and "tier 3" in ct:
            return True
        if "tier 4" in rt and "tier 4" in ct:
            return True
        if "journeyman" in rt and "journeyman" in ct:
            return True
        if "master" in rt and "master" in ct:
            return True
        if "pre-apprentice" in rt and "pre-apprentice" in ct:
            return True
        return False

    @staticmethod
    def _clearance_satisfies(candidate_clearance: str, required_clearance: str) -> bool:
        hierarchy = {
            "None": 0,
            "Public Trust / Commercial Unclassified": 1,
            "Secret": 2,
            "Top Secret / SCI": 3,
        }
        cand_level = hierarchy.get(candidate_clearance, 0)
        req_level = hierarchy.get(required_clearance, 0)
        return cand_level >= req_level
