export type DigitalAssetLink = {
  relation: string[];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

function parseSha256Fingerprints(raw: string | undefined) {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(/[,\n]/)
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

export function getTwaAndroidPackageName() {
  return process.env.TWA_ANDROID_PACKAGE_NAME?.trim() || null;
}

export function getTwaSha256Fingerprints() {
  return parseSha256Fingerprints(process.env.TWA_SHA256_FINGERPRINTS);
}

export function buildTwaAssetLinks(): DigitalAssetLink[] | null {
  const packageName = getTwaAndroidPackageName();
  const sha256CertFingerprints = getTwaSha256Fingerprints();

  if (!packageName || sha256CertFingerprints.length === 0) {
    return null;
  }

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: sha256CertFingerprints,
      },
    },
  ];
}
