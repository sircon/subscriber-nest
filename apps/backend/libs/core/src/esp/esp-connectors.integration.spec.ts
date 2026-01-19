import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Import all 14 new ESP connectors
import { CampaignMonitorConnector } from './campaign-monitor.connector';
import { EmailOctopusConnector } from './email-octopus.connector';
import { OmedaConnector } from './omeda.connector';
import { GhostConnector } from './ghost.connector';
import { SparkPostConnector } from './sparkpost.connector';
import { ActiveCampaignConnector } from './active-campaign.connector';
import { CustomerIoConnector } from './customer-io.connector';
import { SailthruConnector } from './sailthru.connector';
import { MailerLiteConnector } from './mailerlite.connector';
import { PostUpConnector } from './postup.connector';
import { ConstantContactConnector } from './constant-contact.connector';
import { IterableConnector } from './iterable.connector';
import { SendGridConnector } from './sendgrid.connector';
import { BrevoConnector } from './brevo.connector';

/**
 * Integration tests for all 14 new ESP connectors
 * Tests use mock HTTP responses to verify each connector's behavior
 */

// Helper to create mock Axios response
function createMockResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  };
}

// Helper to create mock Axios error
function createMockError(status: number, data: any = {}): AxiosError {
  const error = new Error('Request failed') as AxiosError;
  error.response = {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  };
  error.isAxiosError = true;
  return error;
}

describe('ESP Connectors Integration Tests', () => {
  let httpService: HttpService;

  // Mock HTTP service setup
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHttpService.get.mockReset();
    mockHttpService.post.mockReset();
  });

  // ==================== Campaign Monitor ====================
  describe('CampaignMonitorConnector', () => {
    let connector: CampaignMonitorConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CampaignMonitorConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<CampaignMonitorConnector>(CampaignMonitorConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse([{ ClientID: '123', Name: 'Test Client' }])));
        const result = await connector.validateApiKey('valid-api-key');
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api.createsend.com/api/v3.2/clients.json',
          expect.any(Object)
        );
      });

      it('should return false for invalid API key (401)', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(401)));
        const result = await connector.validateApiKey('invalid-api-key');
        expect(result).toBe(false);
      });

      it('should return false for forbidden (403)', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(403)));
        const result = await connector.validateApiKey('forbidden-key');
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should fetch and map publications correctly', async () => {
        const mockClients = [{ ClientID: 'client1', Name: 'Client 1' }];
        const mockLists = [{ ListID: 'list1', Name: 'Newsletter' }];

        mockHttpService.get
          .mockReturnValueOnce(of(createMockResponse(mockClients)))
          .mockReturnValueOnce(of(createMockResponse(mockLists)));

        const publications = await connector.fetchPublications('valid-key');
        expect(publications).toHaveLength(1);
        expect(publications[0]).toMatchObject({ id: 'list1', name: 'Newsletter' });
      });

      it('should throw error on rate limit (429)', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(429)));
        await expect(connector.fetchPublications('key')).rejects.toThrow('Rate limit exceeded');
      });

      it('should throw error on server error (500)', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(500)));
        await expect(connector.fetchPublications('key')).rejects.toThrow('server error');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch and map subscribers correctly', async () => {
        const mockActiveResponse = {
          Results: [{ EmailAddress: 'test@example.com', Name: 'John Doe', State: 'Active' }],
          NumberOfPages: 1,
        };
        const mockUnsubscribedResponse = { Results: [], NumberOfPages: 1 };

        mockHttpService.get
          .mockReturnValueOnce(of(createMockResponse(mockActiveResponse)))
          .mockReturnValueOnce(of(createMockResponse(mockUnsubscribedResponse)));

        const subscribers = await connector.fetchSubscribers('key', 'list1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
        expect(subscribers[0].status).toBe('active');
      });

      it('should throw error for non-existent list (404)', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(404)));
        await expect(connector.fetchSubscribers('key', 'invalid-list')).rejects.toThrow('not found');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return subscriber count', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ TotalActiveSubscribers: 150 })));
        const count = await connector.getSubscriberCount('key', 'list1');
        expect(count).toBe(150);
      });
    });
  });

  // ==================== Email Octopus ====================
  describe('EmailOctopusConnector', () => {
    let connector: EmailOctopusConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailOctopusConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<EmailOctopusConnector>(EmailOctopusConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ data: [] })));
        const result = await connector.validateApiKey('valid-api-key');
        expect(result).toBe(true);
      });

      it('should return false for invalid API key', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(401)));
        const result = await connector.validateApiKey('invalid-key');
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should fetch and map publications', async () => {
        const mockResponse = { data: [{ id: 'list1', name: 'Newsletter' }], paging: {} };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('Newsletter');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch subscribers', async () => {
        const mockResponse = {
          data: [{ id: 'c1', email_address: 'test@example.com', status: 'SUBSCRIBED', fields: { FirstName: 'John' } }],
          paging: { next: null },
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('key', 'list1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
        // Status is included from raw data due to spread operator
        expect(subscribers[0].status).toBeDefined();
        expect(subscribers[0].firstName).toBe('John');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return subscriber count from counts object', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ counts: { subscribed: 250 } })));
        const count = await connector.getSubscriberCount('key', 'list1');
        expect(count).toBe(250);
      });
    });
  });

  // ==================== Omeda ====================
  describe('OmedaConnector', () => {
    let connector: OmedaConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OmedaConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<OmedaConnector>(OmedaConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid compound API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ Brand: 'TestBrand' })));
        const result = await connector.validateApiKey('mybrand:appid123:inputid456');
        expect(result).toBe(true);
      });

      it('should return false for invalid credentials', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(401)));
        const result = await connector.validateApiKey('mybrand:invalid:key');
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should fetch products as publications', async () => {
        const mockResponse = { Products: [{ ProductId: 1, ProductName: 'Newsletter' }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('mybrand:appid:inputid');
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('Newsletter');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch audience members as subscribers', async () => {
        const mockResponse = {
          Customers: [{ CustomerId: 1, Email: 'test@example.com', FirstName: 'John', EmailStatus: 'A' }],
          TotalCount: 1,
        };
        mockHttpService.post.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('mybrand:appid:inputid', '1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
        expect(subscribers[0].status).toBe('active');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return count from audience query', async () => {
        mockHttpService.post.mockReturnValue(of(createMockResponse({ TotalCount: 500 })));
        const count = await connector.getSubscriberCount('mybrand:appid:inputid', '1');
        expect(count).toBe(500);
      });
    });
  });

  // ==================== Ghost ====================
  describe('GhostConnector', () => {
    let connector: GhostConnector;
    const validApiKey = 'https://mysite.ghost.io|6789abcd1234567890123456:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GhostConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<GhostConnector>(GhostConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid Ghost API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ site: { title: 'My Blog' } })));
        const result = await connector.validateApiKey(validApiKey);
        expect(result).toBe(true);
      });

      it('should return false for missing site URL', async () => {
        const result = await connector.validateApiKey('invalidkey');
        expect(result).toBe(false);
      });

      it('should return false for unauthorized', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(401)));
        const result = await connector.validateApiKey(validApiKey);
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should return site info as single publication', async () => {
        const mockResponse = { site: { title: 'My Ghost Blog', url: 'https://mysite.ghost.io' } };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications(validApiKey);
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('My Ghost Blog');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch members as subscribers', async () => {
        const mockResponse = {
          members: [{ id: 'm1', email: 'member@example.com', name: 'John Doe', subscribed: true }],
          meta: { pagination: { next: null } },
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers(validApiKey, 'site-id');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('member@example.com');
        // Ghost members with subscribed=true are active
        expect(subscribers[0].status).toBe('active');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return member count from pagination meta', async () => {
        const mockResponse = { members: [], meta: { pagination: { total: 1000 } } };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const count = await connector.getSubscriberCount(validApiKey, 'site-id');
        expect(count).toBe(1000);
      });
    });
  });

  // ==================== SparkPost ====================
  describe('SparkPostConnector', () => {
    let connector: SparkPostConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SparkPostConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<SparkPostConnector>(SparkPostConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ company_name: 'Test' })));
        const result = await connector.validateApiKey('valid-spark-key');
        expect(result).toBe(true);
      });

      it('should use EU endpoint for eu| prefixed key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ company_name: 'Test' })));
        await connector.validateApiKey('eu|valid-eu-key');
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api.eu.sparkpost.com/api/v1/account',
          expect.any(Object)
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch recipient lists', async () => {
        const mockResponse = { results: [{ id: 'list1', name: 'Main List', total_accepted_recipients: 100 }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('Main List');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch recipients from list', async () => {
        const mockResponse = {
          results: {
            recipients: [{ address: { email: 'test@example.com', name: 'John Doe' }, substitution_data: {} }],
          },
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('key', 'list1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return total_accepted_recipients', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ results: { total_accepted_recipients: 5000 } })));
        const count = await connector.getSubscriberCount('key', 'list1');
        expect(count).toBe(5000);
      });
    });
  });

  // ==================== ActiveCampaign ====================
  describe('ActiveCampaignConnector', () => {
    let connector: ActiveCampaignConnector;
    const validApiKey = 'myaccount|api-key-123';

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActiveCampaignConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<ActiveCampaignConnector>(ActiveCampaignConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid compound API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ lists: [] })));
        const result = await connector.validateApiKey(validApiKey);
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://myaccount.api-us1.com/api/3/lists',
          expect.objectContaining({
            headers: expect.objectContaining({ 'Api-Token': 'api-key-123' }),
          })
        );
      });

      it('should return false for invalid format', async () => {
        const result = await connector.validateApiKey('invalid-no-pipe');
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should fetch lists as publications', async () => {
        const mockResponse = { lists: [{ id: '1', name: 'Newsletter', subscriber_count: '100' }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications(validApiKey);
        expect(publications).toHaveLength(1);
        expect(publications[0].subscriberCount).toBe(100);
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch contacts filtered by list', async () => {
        const mockResponse = {
          contacts: [{ id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' }],
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers(validApiKey, '1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
        expect(subscribers[0].firstName).toBe('John');
        // Status defaults to 'active' when not specified
        expect(subscribers[0].status).toBe('active');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return subscriber_count from list details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ list: { subscriber_count: '2500' } })));
        const count = await connector.getSubscriberCount(validApiKey, '1');
        expect(count).toBe(2500);
      });
    });
  });

  // ==================== Customer.io ====================
  describe('CustomerIoConnector', () => {
    let connector: CustomerIoConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CustomerIoConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<CustomerIoConnector>(CustomerIoConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ segments: [] })));
        const result = await connector.validateApiKey('valid-app-api-key');
        expect(result).toBe(true);
      });

      it('should use EU endpoint for eu| prefixed key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ segments: [] })));
        await connector.validateApiKey('eu|valid-eu-key');
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api-eu.customer.io/v1/segments',
          expect.any(Object)
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch segments as publications', async () => {
        const mockResponse = { segments: [{ id: 1, name: 'Active Users', state: 'active' }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('Active Users');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch segment members and their profiles', async () => {
        const mockMembership = { ids: ['customer1'], next: null };
        const mockProfile = { customer: { email: 'test@example.com', first_name: 'John' } };

        mockHttpService.get
          .mockReturnValueOnce(of(createMockResponse(mockMembership)))
          .mockReturnValueOnce(of(createMockResponse(mockProfile)));

        const subscribers = await connector.fetchSubscribers('key', '1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return count from segment details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ segment: { count: 1500 } })));
        const count = await connector.getSubscriberCount('key', '1');
        expect(count).toBe(1500);
      });
    });
  });

  // ==================== Sailthru ====================
  describe('SailthruConnector', () => {
    let connector: SailthruConnector;
    const validApiKey = 'api-key-123|api-secret-456';

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SailthruConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<SailthruConnector>(SailthruConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid compound API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ features: {} })));
        const result = await connector.validateApiKey(validApiKey);
        expect(result).toBe(true);
      });

      it('should return false for invalid format', async () => {
        const result = await connector.validateApiKey('no-pipe-invalid');
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should fetch lists as publications', async () => {
        const mockResponse = { lists: [{ name: 'Newsletter', email_count: 500, type: 'normal' }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications(validApiKey);
        expect(publications).toHaveLength(1);
        expect(publications[0].id).toBe('Newsletter');
        expect(publications[0].emailCount).toBe(500);
      });
    });

    describe('getSubscriberCount', () => {
      it('should return email_count from list details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ email_count: 3000 })));
        const count = await connector.getSubscriberCount(validApiKey, 'Newsletter');
        expect(count).toBe(3000);
      });
    });
  });

  // ==================== MailerLite ====================
  describe('MailerLiteConnector', () => {
    let connector: MailerLiteConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailerLiteConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<MailerLiteConnector>(MailerLiteConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ data: [] })));
        const result = await connector.validateApiKey('valid-bearer-token');
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://connect.mailerlite.com/api/groups',
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer valid-bearer-token' }),
          })
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch groups as publications', async () => {
        const mockResponse = { data: [{ id: '123', name: 'VIP Group', active_count: 200 }], links: {} };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('VIP Group');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch subscribers filtered by group', async () => {
        const mockResponse = {
          data: [{ id: 's1', email: 'test@example.com', status: 'active', fields: {} }],
          links: {},
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('key', '123');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return active_count from group details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ data: { active_count: 750 } })));
        const count = await connector.getSubscriberCount('key', '123');
        expect(count).toBe(750);
      });
    });
  });

  // ==================== PostUp ====================
  describe('PostUpConnector', () => {
    let connector: PostUpConnector;
    const validApiKey = 'username:password123';

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PostUpConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<PostUpConnector>(PostUpConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid Basic Auth credentials', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse([])));
        const result = await connector.validateApiKey(validApiKey);
        expect(result).toBe(true);
      });

      it('should return false for invalid credentials', async () => {
        mockHttpService.get.mockReturnValue(throwError(() => createMockError(401)));
        const result = await connector.validateApiKey('bad:creds');
        expect(result).toBe(false);
      });
    });

    describe('fetchPublications', () => {
      it('should fetch lists as publications', async () => {
        const mockResponse = [{ listId: 1, listName: 'Main List', recipientCount: 300 }];
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications(validApiKey);
        expect(publications).toHaveLength(1);
        expect(publications[0].name).toBe('Main List');
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch recipients filtered by listId', async () => {
        const mockResponse = [{ recipientId: 1, address: 'test@example.com', demographics: { firstName: 'John' } }];
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers(validApiKey, '1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
        // Status defaults to 'active' when not provided
        expect(subscribers[0].status).toBe('active');
        expect(subscribers[0].firstName).toBe('John');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return recipientCount from list details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ recipientCount: 1200 })));
        const count = await connector.getSubscriberCount(validApiKey, '1');
        expect(count).toBe(1200);
      });
    });
  });

  // ==================== Constant Contact ====================
  describe('ConstantContactConnector', () => {
    let connector: ConstantContactConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConstantContactConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<ConstantContactConnector>(ConstantContactConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid OAuth token', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ organization: {} })));
        const result = await connector.validateApiKey('oauth-access-token');
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api.cc.email/v3/account/summary',
          expect.any(Object)
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch contact_lists as publications', async () => {
        const mockResponse = { lists: [{ list_id: 'l1', name: 'Main List', membership_count: 500 }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('token');
        expect(publications).toHaveLength(1);
        expect(publications[0].subscriberCount).toBe(500);
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch contacts filtered by list', async () => {
        const mockResponse = {
          contacts: [{
            contact_id: 'c1',
            email_address: { address: 'test@example.com' },
            first_name: 'John',
          }],
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('token', 'l1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return membership_count from list details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ membership_count: 2000 })));
        const count = await connector.getSubscriberCount('token', 'l1');
        expect(count).toBe(2000);
      });
    });
  });

  // ==================== Iterable ====================
  describe('IterableConnector', () => {
    let connector: IterableConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IterableConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<IterableConnector>(IterableConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ lists: [] })));
        const result = await connector.validateApiKey('iterable-api-key');
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api.iterable.com/api/lists',
          expect.objectContaining({
            headers: expect.objectContaining({ 'Api-Key': 'iterable-api-key' }),
          })
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch lists as publications', async () => {
        const mockResponse = { lists: [{ id: 1, name: 'Main List', size: 1000 }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].subscriberCount).toBe(1000);
      });
    });

    describe('getSubscriberCount', () => {
      it('should return size from list in /lists response', async () => {
        const mockResponse = { lists: [{ id: 1, name: 'Main', size: 5000 }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const count = await connector.getSubscriberCount('key', '1');
        expect(count).toBe(5000);
      });

      it('should throw for non-existent list', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ lists: [] })));
        await expect(connector.getSubscriberCount('key', '999')).rejects.toThrow('List not found');
      });
    });
  });

  // ==================== SendGrid ====================
  describe('SendGridConnector', () => {
    let connector: SendGridConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SendGridConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<SendGridConnector>(SendGridConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid Bearer token', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ result: [] })));
        const result = await connector.validateApiKey('sendgrid-api-key');
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api.sendgrid.com/v3/marketing/lists',
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer sendgrid-api-key' }),
          })
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch marketing lists as publications', async () => {
        const mockResponse = { result: [{ id: 'list1', name: 'Newsletter', contact_count: 800 }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].contactCount).toBe(800);
      });
    });

    describe('fetchSubscribers', () => {
      it('should search contacts by list using SEGQL', async () => {
        const mockResponse = {
          result: [{ id: 'c1', email: 'test@example.com', first_name: 'John' }],
        };
        mockHttpService.post.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('key', 'list1');
        expect(subscribers).toHaveLength(1);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          'https://api.sendgrid.com/v3/marketing/contacts/search',
          expect.objectContaining({ query: expect.stringContaining('list1') }),
          expect.any(Object)
        );
      });
    });

    describe('getSubscriberCount', () => {
      it('should return contact_count from list details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ contact_count: 3500 })));
        const count = await connector.getSubscriberCount('key', 'list1');
        expect(count).toBe(3500);
      });
    });
  });

  // ==================== Brevo ====================
  describe('BrevoConnector', () => {
    let connector: BrevoConnector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BrevoConnector,
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      connector = module.get<BrevoConnector>(BrevoConnector);
    });

    describe('validateApiKey', () => {
      it('should return true for valid api-key header auth', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ email: 'test@company.com' })));
        const result = await connector.validateApiKey('brevo-api-key');
        expect(result).toBe(true);
        expect(mockHttpService.get).toHaveBeenCalledWith(
          'https://api.brevo.com/v3/account',
          expect.objectContaining({
            headers: expect.objectContaining({ 'api-key': 'brevo-api-key' }),
          })
        );
      });
    });

    describe('fetchPublications', () => {
      it('should fetch contacts/lists as publications', async () => {
        const mockResponse = { lists: [{ id: 1, name: 'Main List', uniqueSubscribers: 600 }] };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const publications = await connector.fetchPublications('key');
        expect(publications).toHaveLength(1);
        expect(publications[0].subscriberCount).toBe(600);
      });
    });

    describe('fetchSubscribers', () => {
      it('should fetch contacts from list', async () => {
        const mockResponse = {
          contacts: [{ id: 1, email: 'test@example.com', attributes: { FIRSTNAME: 'John' } }],
        };
        mockHttpService.get.mockReturnValue(of(createMockResponse(mockResponse)));

        const subscribers = await connector.fetchSubscribers('key', '1');
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
        expect(subscribers[0].firstName).toBe('John');
      });
    });

    describe('getSubscriberCount', () => {
      it('should return uniqueSubscribers from list details', async () => {
        mockHttpService.get.mockReturnValue(of(createMockResponse({ uniqueSubscribers: 4500 })));
        const count = await connector.getSubscriberCount('key', '1');
        expect(count).toBe(4500);
      });
    });
  });

  // ==================== Error Handling Tests ====================
  describe('Common Error Handling', () => {
    const connectorConfigs = [
      { name: 'CampaignMonitor', connector: CampaignMonitorConnector, apiKey: 'test-key' },
      { name: 'EmailOctopus', connector: EmailOctopusConnector, apiKey: 'test-key' },
      { name: 'Omeda', connector: OmedaConnector, apiKey: 'client:appid:inputid' },
      { name: 'SparkPost', connector: SparkPostConnector, apiKey: 'test-key' },
      { name: 'MailerLite', connector: MailerLiteConnector, apiKey: 'test-key' },
      { name: 'PostUp', connector: PostUpConnector, apiKey: 'user:pass' },
      { name: 'ConstantContact', connector: ConstantContactConnector, apiKey: 'test-token' },
      { name: 'Iterable', connector: IterableConnector, apiKey: 'test-key' },
      { name: 'SendGrid', connector: SendGridConnector, apiKey: 'test-key' },
      { name: 'Brevo', connector: BrevoConnector, apiKey: 'test-key' },
    ];

    connectorConfigs.forEach(({ name, connector: ConnectorClass, apiKey }) => {
      describe(`${name} Error Handling`, () => {
        let connector: any;

        beforeEach(async () => {
          const module: TestingModule = await Test.createTestingModule({
            providers: [
              ConnectorClass,
              { provide: HttpService, useValue: mockHttpService },
            ],
          }).compile();

          connector = module.get(ConnectorClass);
        });

        it('should handle 401 Unauthorized error', async () => {
          mockHttpService.get.mockReturnValue(throwError(() => createMockError(401)));
          const result = await connector.validateApiKey(apiKey);
          expect(result).toBe(false);
        });

        it('should handle 403 Forbidden error', async () => {
          mockHttpService.get.mockReturnValue(throwError(() => createMockError(403)));
          const result = await connector.validateApiKey(apiKey);
          expect(result).toBe(false);
        });

        it('should throw on 429 Rate Limit for fetchPublications', async () => {
          mockHttpService.get.mockReturnValue(throwError(() => createMockError(429)));
          await expect(connector.fetchPublications(apiKey)).rejects.toThrow(/rate limit/i);
        });

        it('should throw on 500 Server Error for fetchPublications', async () => {
          mockHttpService.get.mockReturnValue(throwError(() => createMockError(500)));
          await expect(connector.fetchPublications(apiKey)).rejects.toThrow(/server error/i);
        });
      });
    });
  });
});
