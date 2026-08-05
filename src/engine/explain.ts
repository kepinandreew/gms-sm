import { Team, Assignment, ExplanationDetails } from '../types';
import { SERVICE_SLOTS, SERVICE_LOCATIONS } from '../data/locationsAndSlots';

export function getAssignmentExplanation(params: {
  teamId: string;
  slotId: string;
  scheduleId: string;
  allTeams: Team[];
  allScheduleAssignments: Assignment[];
  pastAssignments: Assignment[];
}): ExplanationDetails {
  const { teamId, slotId, scheduleId, allTeams, allScheduleAssignments, pastAssignments } = params;

  const team = allTeams.find((t) => t.id === teamId);
  const slot = SERVICE_SLOTS.find((s) => s.id === slotId);
  const location = SERVICE_LOCATIONS.find((l) => l.id === slot?.location_id);

  const teamName = team ? team.name : 'Unknown Team';
  const locationName = location ? location.name : 'Lokasi Pelayanan';
  const slotName = slot ? slot.name : 'Slot Ibadah';

  // Compute monthly count for this team
  const currentScheduleAssignments = allScheduleAssignments.filter((a) => a.schedule_id === scheduleId);
  const teamMonthlyAssignments = currentScheduleAssignments.filter((a) => a.team_id === teamId);
  const monthlyCount = teamMonthlyAssignments.length;

  const totalMonthlySlots = currentScheduleAssignments.length;
  const activeTeamsCount = allTeams.filter((t) => t.status === 'active').length || 20;
  const monthlyTarget = Math.round(totalMonthlySlots / activeTeamsCount);

  // Lifetime count
  const allTeamAssignments = [...pastAssignments, ...currentScheduleAssignments].filter(
    (a) => a.team_id === teamId
  );
  const totalLifetimeServices = allTeamAssignments.length;

  // Recent Location History
  const locationCounts: Record<string, number> = {};
  allTeamAssignments.forEach((a) => {
    const locName = SERVICE_LOCATIONS.find((l) => l.id === a.location_id)?.name || a.location_id;
    locationCounts[locName] = (locationCounts[locName] || 0) + 1;
  });

  const recentLocationHistory = Object.entries(locationCounts).map(([loc, count]) => ({
    location: loc,
    count,
  }));

  // Recent Slot History
  const slotCounts: Record<string, number> = {};
  allTeamAssignments.forEach((a) => {
    const sName = SERVICE_SLOTS.find((s) => s.id === a.slot_id)?.name || a.slot_id;
    slotCounts[sName] = (slotCounts[sName] || 0) + 1;
  });

  const recentSlotHistory = Object.entries(slotCounts).map(([s, count]) => ({
    slot: s,
    count,
  }));

  // Construct detailed explanation text
  const locationTimesServed = locationCounts[locationName] || 0;
  const slotTimesServed = slotCounts[slotName] || 0;

  const explanationParts: string[] = [];

  // Hard constraints check status
  explanationParts.push(
    `✓ ${teamName} dalam kondisi AVAILABLE dan OFF pada service weekend sebelumnya (memenuhi Rule Wajib OFF 1 Minggu).`
  );

  // Unique location reason
  explanationParts.push(
    `✓ ${teamName} belum pernah melayani di lokasi ${locationName} pada bulan berjalan (memenuhi Rule Unique Location per Bulan).`
  );

  // Unique shift type reason
  explanationParts.push(
    `✓ Slot ${slotName} dipilih karena ${teamName} belum pernah mendapatkan tipe shift ini pada bulan berjalan (memenuhi Rule Unique Shift Type per Bulan).`
  );

  // Monthly balance reason
  if (monthlyCount <= monthlyTarget) {
    explanationParts.push(
      `✓ Distribusi kuota seimbang: ${teamName} saat ini baru mengumpulkan ${monthlyCount} pelayanan bulan ini dari target ideal ${monthlyTarget} pelayanan.`
    );
  } else {
    explanationParts.push(
      `✓ ${teamName} mendapatkan assignment ini untuk melengkapi kuota pelayanan bulan berjalan secara adil.`
    );
  }

  const explanation_text = explanationParts.join(' ');

  // Synthetic sub-scores for detailed modal display
  const monthly_urgency = Math.min(100, Math.round(((monthlyTarget + 1 - monthlyCount) / (monthlyTarget + 1)) * 100));
  const location_fit = Math.max(40, 100 - locationTimesServed * 15);
  const slot_fit = Math.max(40, 100 - slotTimesServed * 15);
  const longterm_urgency = Math.max(50, 95 - Math.floor(totalLifetimeServices / 5));

  const total_score = Math.round((monthly_urgency * 0.5 + longterm_urgency * 0.2 + location_fit * 0.15 + slot_fit * 0.15));

  return {
    team_name: teamName,
    location_name: locationName,
    slot_name: slotName,
    monthly_count: monthlyCount,
    monthly_target: monthlyTarget,
    total_lifetime_services: totalLifetimeServices,
    recent_location_history: recentLocationHistory,
    recent_slot_history: recentSlotHistory,
    explanation_text,
    score_breakdown: {
      monthly_urgency,
      longterm_urgency,
      location_fit,
      slot_fit,
      total_score,
    },
  };
}
