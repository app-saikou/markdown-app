#import <Foundation/Foundation.h>

/// iOS 26 beta: AdMob と HermesVM のシグナルハンドラ競合を回避
void DisableAdMobCrashReporting(void);
