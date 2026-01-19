/**
 * ESP (Email Service Provider) configuration
 * Centralized configuration for all supported ESPs
 */
/**
 * All supported ESPs with their configuration
 */
export const espConfigs = [
    {
        id: 'beehiiv',
        name: 'beehiiv',
        description: 'Connect your beehiiv account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'kit',
        name: 'Kit',
        description: 'Connect your Kit account to sync subscribers',
        supportsOAuth: true,
    },
    {
        id: 'mailchimp',
        name: 'Mailchimp',
        description: 'Connect your Mailchimp account to sync subscribers',
        supportsOAuth: true,
    },
    {
        id: 'campaign_monitor',
        name: 'Campaign Monitor',
        description: 'Connect your Campaign Monitor account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'email_octopus',
        name: 'Email Octopus',
        description: 'Connect your Email Octopus account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'omeda',
        name: 'Omeda',
        description: 'Connect your Omeda account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'ghost',
        name: 'Ghost',
        description: 'Connect your Ghost publication to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'sparkpost',
        name: 'SparkPost',
        description: 'Connect your SparkPost account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'active_campaign',
        name: 'ActiveCampaign',
        description: 'Connect your ActiveCampaign account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'customer_io',
        name: 'Customer.io',
        description: 'Connect your Customer.io account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'sailthru',
        name: 'Sailthru',
        description: 'Connect your Sailthru account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'mailerlite',
        name: 'MailerLite',
        description: 'Connect your MailerLite account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'postup',
        name: 'PostUp',
        description: 'Connect your PostUp account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'constant_contact',
        name: 'Constant Contact',
        description: 'Connect your Constant Contact account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'iterable',
        name: 'Iterable',
        description: 'Connect your Iterable account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'sendgrid',
        name: 'SendGrid',
        description: 'Connect your SendGrid account to sync subscribers',
        supportsOAuth: false,
    },
    {
        id: 'brevo',
        name: 'Brevo',
        description: 'Connect your Brevo account to sync subscribers',
        supportsOAuth: false,
    },
];
/**
 * Get ESP config by ID
 */
export function getEspConfig(espType) {
    return espConfigs.find((config) => config.id === espType);
}
/**
 * Get ESP display name by ID
 */
export function getEspName(espType) {
    return getEspConfig(espType)?.name || espType;
}
/**
 * Check if ESP supports OAuth
 */
export function supportsOAuth(espType) {
    return getEspConfig(espType)?.supportsOAuth || false;
}
/**
 * Get all ESP names for display (e.g., in FAQ)
 */
export function getAllEspNames() {
    return espConfigs.map((config) => config.name);
}
/**
 * Get formatted list of ESP names for FAQ
 */
export function getFormattedEspList() {
    const names = getAllEspNames();
    if (names.length === 0)
        return '';
    if (names.length === 1)
        return names[0];
    if (names.length === 2)
        return `${names[0]} and ${names[1]}`;
    const last = names[names.length - 1];
    const rest = names.slice(0, -1);
    return `${rest.join(', ')}, and ${last}`;
}
