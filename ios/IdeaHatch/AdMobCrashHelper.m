#import "AdMobCrashHelper.h"
#import <GoogleMobileAds/GoogleMobileAds.h>

void DisableAdMobCrashReporting(void) {
    [[GADMobileAds sharedInstance] disableSDKCrashReporting];
}
