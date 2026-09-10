import { test as setup } from '../fixtures/fixtures';

const AUTH_FILE = 'playwright/.auth/standard_user.json';

setup('authenticate as standard_user', async ({ loginPage, inventoryPage, page }) => {
  await loginPage.openLoginPage();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.assertIsOpened();

  await page.context().storageState({ path: AUTH_FILE });
});