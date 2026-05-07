"""Generate a VAPID keypair for Web Push.

Run once and copy the output into both:
  - backend/.env             (VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)
  - frontend/.env.local      (NEXT_PUBLIC_VAPID_PUBLIC_KEY — public key only)
  - Railway env vars         (same as backend/.env)

Usage from the backend directory with the venv active:
    python -m scripts.gen_vapid_keys

The keys are P-256 ECDSA, base64url-encoded with no padding (the format
both pywebpush and the browser PushManager.subscribe API expect).
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url_nopad(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())

    # Private key — raw 32-byte scalar (DER format pywebpush also accepts,
    # but raw is what browsers and most Web Push libs use)
    private_numbers = private_key.private_numbers()
    private_bytes = private_numbers.private_value.to_bytes(32, "big")

    # Public key — uncompressed point: 0x04 || X || Y, 65 bytes total
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print("VAPID_PRIVATE_KEY=" + b64url_nopad(private_bytes))
    print("VAPID_PUBLIC_KEY=" + b64url_nopad(public_bytes))
    print()
    print("Frontend (.env.local):")
    print("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + b64url_nopad(public_bytes))


if __name__ == "__main__":
    main()
