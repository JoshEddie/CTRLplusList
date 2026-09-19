import { type Page } from '@playwright/test';

// Drives the hero's Spoilers segmented control: click the radio option whose
// visible label matches `label` ("Surprise", "Progress", "Claimed"). The
// radiogroup is labelled "Spoilers" and each tier is a `radio`.
export async function raiseSpoilerTier(
  page: Page,
  label: string
): Promise<void> {
  await page
    .getByRole('radiogroup', { name: 'Spoilers' })
    .getByRole('radio', { name: label })
    .click();
}
