"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EspModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const beehiiv_connector_1 = require("./beehiiv.connector");
const mailchimp_connector_1 = require("./mailchimp.connector");
const kit_connector_1 = require("./kit.connector");
const active_campaign_connector_1 = require("./active-campaign.connector");
const brevo_connector_1 = require("./brevo.connector");
const campaign_monitor_connector_1 = require("./campaign-monitor.connector");
const constant_contact_connector_1 = require("./constant-contact.connector");
const customer_io_connector_1 = require("./customer-io.connector");
const email_octopus_connector_1 = require("./email-octopus.connector");
const ghost_connector_1 = require("./ghost.connector");
const iterable_connector_1 = require("./iterable.connector");
const mailerlite_connector_1 = require("./mailerlite.connector");
const omeda_connector_1 = require("./omeda.connector");
const postup_connector_1 = require("./postup.connector");
const sailthru_connector_1 = require("./sailthru.connector");
const sendgrid_connector_1 = require("./sendgrid.connector");
const sparkpost_connector_1 = require("./sparkpost.connector");
let EspModule = class EspModule {
};
exports.EspModule = EspModule;
exports.EspModule = EspModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        providers: [
            beehiiv_connector_1.BeehiivConnector,
            kit_connector_1.KitConnector,
            mailchimp_connector_1.MailchimpConnector,
            active_campaign_connector_1.ActiveCampaignConnector,
            brevo_connector_1.BrevoConnector,
            campaign_monitor_connector_1.CampaignMonitorConnector,
            constant_contact_connector_1.ConstantContactConnector,
            customer_io_connector_1.CustomerIoConnector,
            email_octopus_connector_1.EmailOctopusConnector,
            ghost_connector_1.GhostConnector,
            iterable_connector_1.IterableConnector,
            mailerlite_connector_1.MailerLiteConnector,
            omeda_connector_1.OmedaConnector,
            postup_connector_1.PostUpConnector,
            sailthru_connector_1.SailthruConnector,
            sendgrid_connector_1.SendGridConnector,
            sparkpost_connector_1.SparkPostConnector,
        ],
        exports: [
            beehiiv_connector_1.BeehiivConnector,
            kit_connector_1.KitConnector,
            mailchimp_connector_1.MailchimpConnector,
            active_campaign_connector_1.ActiveCampaignConnector,
            brevo_connector_1.BrevoConnector,
            campaign_monitor_connector_1.CampaignMonitorConnector,
            constant_contact_connector_1.ConstantContactConnector,
            customer_io_connector_1.CustomerIoConnector,
            email_octopus_connector_1.EmailOctopusConnector,
            ghost_connector_1.GhostConnector,
            iterable_connector_1.IterableConnector,
            mailerlite_connector_1.MailerLiteConnector,
            omeda_connector_1.OmedaConnector,
            postup_connector_1.PostUpConnector,
            sailthru_connector_1.SailthruConnector,
            sendgrid_connector_1.SendGridConnector,
            sparkpost_connector_1.SparkPostConnector,
        ],
    })
], EspModule);
//# sourceMappingURL=esp.module.js.map