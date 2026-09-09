import {Page, Locator, expect} from "@playwright/test";
import {BasePage} from "./base.page";

export class CartPage extends BasePage{
  readonly returnToInventoryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.returnToInventoryButton = page.locator('[data-test="continue-shopping"]');
  }

  getRemoveButtonByName(itemName: string): Locator {
    return this.page
      .locator('[data-test="inventory-item"]')
      .filter({ hasText: itemName })
      .getByRole('button', { name: 'Remove' });
  }

  async removeItemFromCart(itemName: string) {
    await this.getRemoveButtonByName(itemName).click();
  }

  async assertIsOpened() {
    await expect(this.page).toHaveURL(/\/cart.html/);
  }

  async assertItemAdded(itemName: string): Promise<void> {
    await expect(
      this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName })
    ).toBeVisible();
  }

  async assertItemNotPresent(itemName: string): Promise<void> {
    await expect(
      this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName })
    ).toBeHidden(); // or .toHaveCount(0)
  }
}