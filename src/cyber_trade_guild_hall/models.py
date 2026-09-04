"""
Data models for the Cybersecurity Craft Guild (CCG) Dispatch Hall,
Out-of-Work Registers, Labor Requisitions, and Referral Slips.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class GuildMemberCandidate(BaseModel):
    """
    Guild member profile maintained in the Dispatch Hall for job placement.
    Consumes verified licensure and tier status from the NCTB Clearinghouse.
    """
    trade_id: str
    name: str
    tier: str
    license_status: str = "Active"
    total_verified_hours: float = 0.0
    active_endorsements: List[str] = Field(default_factory=list)
    assigned_jatc_local: str = "LOCAL-101"
    
    # Guild Dispatch Hall specific operational attributes
    work_modality_preference: str = "Any Modality"  # "Remote Only", "Hybrid", "On-Site Only", "Any Modality"
    relocation_willingness: str = "Resident Local Only"  # "Resident Local Only", "Regional Hub", "National / Willing to Relocate"
    security_clearance: str = "Public Trust / Commercial Unclassified"  # "None", "Public Trust / Commercial Unclassified", "Secret", "Top Secret / SCI"
    
    is_seeking_placement: bool = False
    days_seeking_placement: int = 0
    dispatch_book: str = "Book 1 (Resident)"  # "Book 1 (Resident)", "Book 2 (Regional)", "Book 3 (National)"
    registration_date: Optional[str] = None
    
    # Master of Record placement attributes
    seeking_mor_role: bool = False
    mor_availability: str = "Not Seeking MoR"  # "Full-Time MoR", "Fractional MoR (vMoR)", "Emergency Interim MoR", "Any"

    @property
    def is_queue_aging_alert(self) -> bool:
        """Flags candidate waiting 30+ days for Dispatch Officer proactive intervention."""
        return self.is_seeking_placement and self.days_seeking_placement >= 30


class LaborRequisition(BaseModel):
    """
    Formal labor demand submitted to the Guild Dispatch Hall by a PEC employer.
    Direct hiring / recruiter bypass is strictly prohibited.
    """
    requisition_id: str
    employer_pec_id: str
    employer_name: str
    local_id: str
    required_tier: str
    required_endorsement: Optional[str] = None
    work_modality: str = "Any"
    clearance_required: str = "None"
    date_submitted: str
    status: Literal["PENDING", "MATCHED", "REFERRED", "CANCELLED"] = "PENDING"
    notes: Optional[str] = None
    
    # MoR specific requirements
    requires_mor: bool = False
    mor_engagement_type: Optional[str] = "Any"
    
    # Dispatch tracking
    assigned_officer_id: Optional[str] = None
    dispatched_trade_id: Optional[str] = None
    referral_notes: Optional[str] = None


class DispatchReferralSlip(BaseModel):
    """
    Tamper-evident referral slip issued by the neutral Guild Dispatch Officer.
    Directs candidate to report to the sponsoring PEC employer.
    """
    referral_id: str
    requisition_id: str
    employer_pec_id: str
    candidate_trade_id: str
    candidate_name: str
    tier: str
    is_mor_designation: bool = False
    mor_engagement_type: Optional[str] = None
    dispatching_officer_id: str
    referral_date: str
    dispatch_book: str
    days_on_queue: int
    wage_step_percentage: int
    status: Literal["ISSUED", "ACCEPTED", "DECLINED"] = "ISSUED"


class DispatchMatchResult(BaseModel):
    """Result of evaluating a requisition against the FIFO out-of-work queue."""
    matched: bool
    candidate: Optional[GuildMemberCandidate] = None
    evaluated_queue_depth: int
    status_message: str
    queue_aging_alert_triggered: bool = False
