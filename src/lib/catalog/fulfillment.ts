export interface VendorDeliveryReceipt {
  credentialId: string;
  accessKey: string;
  serviceEndpoint: string;
  deliveredAt: string;
  status: "delivered" | "failed";
  details: string;
}

/**
 * Simulates vendor service delivery for an escrow settlement.
 * Demonstrates both successful automated verification and failure/ghosting for safety testing.
 */
export function simulateVendorDelivery(
  offerId: string,
  simulateGhosting = false,
): VendorDeliveryReceipt {
  const timestamp = new Date().toISOString();

  if (simulateGhosting) {
    return {
      credentialId: `fail-${Date.now()}`,
      accessKey: "",
      serviceEndpoint: "https://offline-vendor.mock/timeout",
      deliveredAt: timestamp,
      status: "failed",
      details:
        "Vendor endpoint unreachable (HTTP 504 Gateway Timeout). No service credentials delivered.",
    };
  }

  const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
  const token = `xrp-sec-token-${hash}-${Date.now().toString(36)}`;

  return {
    credentialId: `cred-${offerId}-${hash}`,
    accessKey: token,
    serviceEndpoint: `https://api.${offerId.replace(/[^a-z0-9]/gi, "")}.io/v1/auth`,
    deliveredAt: timestamp,
    status: "delivered",
    details:
      "Automated handshake verified. Encrypted API credentials and service endpoint delivered.",
  };
}
