import React from "react";
import { notFound } from "next/navigation";
import { IncidentDetail } from "@/components/admin/incidents/IncidentDetail";
import { getIncidentById } from "@/lib/status/status";
import {
  addIncidentUpdate,
  createIncident,
  deleteIncident,
  deleteIncidentUpdate,
  editIncidentUpdate,
  updateIncident,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncidentById(id);
  if (!incident) notFound();

  return (
    <IncidentDetail
      incident={incident}
      now={Date.now()}
      actions={{
        createIncident,
        addIncidentUpdate,
        updateIncident,
        editIncidentUpdate,
        deleteIncidentUpdate,
        deleteIncident,
      }}
    />
  );
}
