import config from "config";
import { createClient } from "redis";
import { SingleEpochPrivateTokenAllocations } from "../../models";

// TODO: consider using proper hosted datastore

export async function persistPrivateTokenAllocations(
  addressOfEpochAdmin: string,
  addressOfEpochMember: string,
  privTokenAllocations: number[]
) {
  // Try getting the object from storage.
  const epochOfAdmin = await getEpochOfAdminFromStorage(addressOfEpochAdmin);

  // Update values.
  epochOfAdmin[addressOfEpochMember] = privTokenAllocations;

  console.log("new epoch of admin", { epochOfAdmin });

  // Write back to storage.
  await setEpochOfAdminToStorage(addressOfEpochAdmin, epochOfAdmin);
}

export async function calculateRevealedTokenAllocations(
  addressOfEpochAdmin: string
): Promise<number[]> {
  // Try getting the object from storage.
  const epochOfAdmin = await getEpochOfAdminFromStorage(addressOfEpochAdmin);

  // zip all the private token allocation arrays together
  const privateTokenAllocations = Object.values(epochOfAdmin);
  return privateTokenAllocations.reduce((prev, curr) =>
    prev.map((p, idx) => p + curr[idx])
  );
}

async function setEpochOfAdminToStorage(
  addressOfEpochAdmin: string,
  newEpochOfAdmin: SingleEpochPrivateTokenAllocations
): Promise<void> {
  const redis = createClient({
    url: config.browserRedisUrl,
  });
  await redis.connect();

  try {
    await redis.set(
      `epoch-admin-${addressOfEpochAdmin}`,
      JSON.stringify(newEpochOfAdmin)
    );
  } catch (error: any) {
    console.error("Error setting storage", { addressOfEpochAdmin, error });
  }

  redis.disconnect();
}

async function getEpochOfAdminFromStorage(
  addressOfEpochAdmin: string
): Promise<SingleEpochPrivateTokenAllocations> {
  const redis = createClient({
    url: config.browserRedisUrl,
  });
  await redis.connect();

  try {
    const storedEpochOfAdmin = await redis.get(
      `epoch-admin-${addressOfEpochAdmin}`
    );

    if (storedEpochOfAdmin) {
      console.info("found from storage", { addressOfEpochAdmin });
      return JSON.parse(
        storedEpochOfAdmin
      ) as SingleEpochPrivateTokenAllocations;
    }
  } catch (error: any) {
    console.error("Error getting epoch of admin from storage", {
      addressOfEpochAdmin,
      error,
    });
  }

  console.info("not found from storage, creating new object", {
    addressOfEpochAdmin,
  });
  const newEpochOfAdmin: SingleEpochPrivateTokenAllocations = {};

  try {
    await redis.set(
      `epoch-admin-${addressOfEpochAdmin}`,
      JSON.stringify(newEpochOfAdmin)
    );
  } catch (error: any) {
    console.error("Error setting storage", { addressOfEpochAdmin, error });
  }

  redis.disconnect();

  return newEpochOfAdmin;
}
