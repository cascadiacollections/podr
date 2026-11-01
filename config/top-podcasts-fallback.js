'use strict';

/**
 * Top podcasts used when the API cannot be reached at build time.
 *
 * Development builds always use this list (the inliner does too). A production
 * build uses it only if the live top-podcasts request fails, so the sitemap
 * still names real podcast pages instead of shipping with none.
 *
 * `id.label` is the address the app stores as `feedUrl` and puts in `?feed=`.
 */
module.exports = {
  feed: {
    entry: [
      {
        title: { label: 'The Joe Rogan Experience' },
        id: {
          label: 'https://podcasts.apple.com/us/podcast/the-joe-rogan-experience/id360084272',
          attributes: { 'im:id': '360084272' }
        },
        'im:image': [
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/23/7a/5c/237a5c31-649f-6c21-d2d9-07145044fede/mza_6530649916119460095.jpg/55x55bb.png' },
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/23/7a/5c/237a5c31-649f-6c21-d2d9-07145044fede/mza_6530649916119460095.jpg/60x60bb.png' },
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/23/7a/5c/237a5c31-649f-6c21-d2d9-07145044fede/mza_6530649916119460095.jpg/170x170bb.png' }
        ]
      },
      {
        title: { label: 'SmartLess' },
        id: {
          label: 'https://podcasts.apple.com/us/podcast/smartless/id1521578868',
          attributes: { 'im:id': '1521578868' }
        },
        'im:image': [
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/c2/51/4d/c2514d95-254b-4a84-9f7f-d471a046cb5e/mza_16436982274047367950.jpeg/55x55bb.png' },
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/c2/51/4d/c2514d95-254b-4a84-9f7f-d471a046cb5e/mza_16436982274047367950.jpeg/60x60bb.png' },
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/c2/51/4d/c2514d95-254b-4a84-9f7f-d471a046cb5e/mza_16436982274047367950.jpeg/170x170bb.png' }
        ]
      },
      {
        title: { label: 'Morbid' },
        id: {
          label: 'https://podcasts.apple.com/us/podcast/morbid/id1379959217',
          attributes: { 'im:id': '1379959217' }
        },
        'im:image': [
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/02/10/a6/0210a665-8302-cf9d-5193-86f2c419d145/mza_8920699161292361466.jpg/55x55bb.png' },
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/02/10/a6/0210a665-8302-cf9d-5193-86f2c419d145/mza_8920699161292361466.jpg/60x60bb.png' },
          { label: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/02/10/a6/0210a665-8302-cf9d-5193-86f2c419d145/mza_8920699161292361466.jpg/170x170bb.png' }
        ]
      }
    ]
  }
};
