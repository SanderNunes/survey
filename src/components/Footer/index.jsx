import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();

  return (
  <footer className="relative bg-white">

            {/* Floating NavLink */}
            <div className="absolute -top-6 right-4 z-10">
                <NavLink
                    to={'/home/cellito'}
                    className="flex items-center bg-white shadow-lg text-accent font-medium border p-3 px-7 rounded-full hover:shadow-xl transition"
                >
                    {t("footer.more")}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 15l7-7 7 7"
                        />
                    </svg>
                </NavLink>
            </div>

      {/* Links grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-sm mb-4">{t("footer.productsServices")}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/#" className="hover:text-accent">{t("footer.kuyuyuTariffs")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.dataVoiceSmsPlans")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.socialComboPlans")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.roamingIntlCalling")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.konekta")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.campaignsPromotions")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm mb-4">{t("footer.helpGuides")}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/#" className="hover:text-accent">{t("footer.networkSimIssues")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.dataVoiceSmsHelp")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.esimRouterGuides")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.rechargeHelp")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm mb-4">{t("footer.accountManagement")}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/#" className="hover:text-accent">{t("footer.checkNumberBalance")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.managePlansServices")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.simSwapOwnership")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.transferBalanceUssd")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.termsConditions")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm mb-4">{t("footer.core")}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/#" className="hover:text-accent">{t("footer.simTariffs")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.dataPlans")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.voiceSmsPlans")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.roaming")}</a></li>
              <li><a href="/#" className="hover:text-accent">{t("footer.konekta")}</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t py-4">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 text-center md:text-left">
          <div className="mb-2 md:mb-0">
            {t("footer.copyright")}
          </div>
        </div>
      </div>
    </footer>
  );
}
