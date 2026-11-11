-- PARLADOR COMMUNITY / upgrade v2
-- Run once in Supabase SQL Editor. Existing profiles and verification are preserved.

ALTER TABLE public.member_profiles
  ADD COLUMN IF NOT EXISTS member_number bigint GENERATED ALWAYS AS IDENTITY,
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS soundcloud text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS member_profiles_number_unique
  ON public.member_profiles(member_number);

ALTER TABLE public.member_profiles
  DROP CONSTRAINT IF EXISTS member_profiles_community_fields_check;
ALTER TABLE public.member_profiles
  ADD CONSTRAINT member_profiles_community_fields_check CHECK (
    (avatar_path IS NULL OR
      (char_length(avatar_path) <= 180 AND avatar_path LIKE user_id::text || '/%'))
    AND char_length(instagram) <= 50
    AND char_length(telegram) <= 50
    AND char_length(soundcloud) <= 200
  );

-- Only owners can edit their profile's user-controlled fields.
-- Avoid granting edits to the generated membership number.
REVOKE UPDATE ON public.member_profiles FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.member_profiles TO authenticated;
GRANT UPDATE (user_id, display_name, nickname, bio, is_listed, avatar_path,
  instagram, telegram, soundcloud, updated_at)
  ON public.member_profiles TO authenticated;

-- Listed members' verification is visible to signed-in community members.
-- This does NOT grant anyone the ability to award themselves verification.
DROP POLICY IF EXISTS "Members can read own verification"
  ON public.member_verifications;
DROP POLICY IF EXISTS "Members read verified public profiles"
  ON public.member_verifications;
CREATE POLICY "Members read verified public profiles"
  ON public.member_verifications FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.member_profiles p
      WHERE p.user_id = member_verifications.user_id
        AND p.is_listed = true
    )
  );
GRANT SELECT ON public.member_verifications TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.member_verifications FROM authenticated, anon;

-- A separate PRIVATE bucket for photos explicitly shared with members.
-- The existing private 'member-avatars' bucket remains unchanged.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES('community-avatars','community-avatars',false,5242880,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,
  file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "PARLADOR read shared avatars" ON storage.objects;
DROP POLICY IF EXISTS "PARLADOR upload own shared avatar" ON storage.objects;
DROP POLICY IF EXISTS "PARLADOR update own shared avatar" ON storage.objects;
DROP POLICY IF EXISTS "PARLADOR delete own shared avatar" ON storage.objects;

CREATE POLICY "PARLADOR read shared avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-avatars' AND
    (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      EXISTS (
        SELECT 1 FROM public.member_profiles p
        WHERE p.user_id::text = (storage.foldername(name))[1]
          AND p.is_listed
          AND p.avatar_path = storage.objects.name
      )
    )
  );
CREATE POLICY "PARLADOR upload own shared avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-avatars' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY "PARLADOR update own shared avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id='community-avatars' AND
         (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id='community-avatars' AND
         (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "PARLADOR delete own shared avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id='community-avatars' AND
         (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- Number and badge stay database-controlled. No public/anonymous reads.
