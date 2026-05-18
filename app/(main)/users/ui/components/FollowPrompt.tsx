export default function FollowPrompt({ name }: { name: string | null }) {
  return (
    <div className="profile-follow-prompt" role="status">
      Follow {name ?? 'this user'} to see their new public lists in your feed.
    </div>
  );
}
