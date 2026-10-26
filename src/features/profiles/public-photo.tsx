"use client";
import { SessionPhotoImage } from "@/features/member/session-photo-image";
import { memberForProfessional } from "@/domain/professional-association";
import { useDemoSession } from "@/features/member/demo-session";

export function PublicPhoto({
  professionalId,
  businessName,
}: {
  professionalId: string;
  businessName: string;
}) {
  const { state } = useDemoSession();
  const memberId = memberForProfessional(professionalId, state.applicationId);
  const photo = memberId ? state.photos[memberId] : undefined;
  return photo ? (
    <SessionPhotoImage
      photo={photo}
      alt={`Business photo for ${businessName}`}
      className="profile-photo-placeholder session-public-photo"
    />
  ) : (
    <div className="profile-photo-placeholder">
      <p>Business photo not provided</p>
      <span>Profile images will appear here when available.</span>
    </div>
  );
}
