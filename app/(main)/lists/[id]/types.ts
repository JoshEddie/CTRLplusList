/** What every section of the list route is handed: the route's own promises, unawaited. */
export type ListSectionProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
