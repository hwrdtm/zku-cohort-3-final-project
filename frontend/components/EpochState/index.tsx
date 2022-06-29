import React from "react";
import { Chip } from "@mui/material";
import { EpochState, getAllEpochState } from "../../models";

const EPOCH_STATES_COLORS: Array<"warning" | "success" | "primary" | "error"> =
  ["warning", "success", "primary", "error"];

export default function EpochStateComponent({
  epochState,
}: {
  epochState: EpochState;
}) {
  return (
    <>
      {getAllEpochState().map((EPOCH_STATE, idx) => (
        <Chip
          key={idx}
          label={EPOCH_STATE}
          color={EPOCH_STATES_COLORS[idx]}
          variant={EPOCH_STATE === epochState ? "filled" : "outlined"}
          style={{ marginRight: "5px" }}
        />
      ))}
    </>
  );
}
