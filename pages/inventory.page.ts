import {Page, Locator, expect} from "@playwright/test";
import {BasePage} from "./base.page";

export class InventoryPage extends BasePage{
  constructor(page: Page) {
    super(page);
  }

  getAddToCartButtonByName(itemName: string): Locator {
    return this.page
      .locator('[data-test="inventory-item"]')
      .filter({ hasText: itemName })
      .getByRole('button', { name: 'Add to cart' });
  }

  async addItemToCart(itemName: string) {
    await this.getAddToCartButtonByName(itemName).click();
  }

  async assertIsOpened() {
    await expect(this.page).toHaveURL(/\/inventory.html/);
  }

}